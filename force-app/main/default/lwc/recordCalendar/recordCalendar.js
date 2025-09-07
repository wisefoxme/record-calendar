import { api, track, LightningElement, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import EVENT_CREATED_DATE_FIELD from "@salesforce/schema/Event.CreatedDate";
import EVENT_ID_FIELD from "@salesforce/schema/Event.Id";
import EVENT_START_DATE_FIELD from "@salesforce/schema/Event.StartDateTime";
import EVENT_SUBJECT_FIELD from "@salesforce/schema/Event.Subject";
import getRecords from "@salesforce/apex/CalendarController.getRecords";
import defaultTemplate from "./defaultTemplate";
import lightningCardTemplate from "./cardTemplate";

export default class RecordCalendar extends LightningElement {
  @api iconName = "standard:event";
  @api recordId;
  @api refDate = new Date();
  @api relatedListName = "Events";
  @api title = "Record Event Calendar";
  @api useLightningCard = false;
  @track weeks = [];
  eventData = [];
  wiredEventResult;
  loading = false;

  @api
  get value() {
    return this.weeks;
  }

  @api
  getDateForEvent(eventId) {
    // searches through the calendar for the event related to the record that has the event ID
    for (const week of this.weeks) {
      for (const day of week.days) {
        const event = day.events.find(
          (e) => e[EVENT_ID_FIELD.fieldApiName] === eventId
        );
        if (event) {
          return day.date;
        }
      }
    }

    return null;
  }

  @api
  getEventsForDate(dateRef) {
    const week = this._getWeekForDate(dateRef);
    if (week) {
      const day = week.days.find((d) => d.date.getDate() === dateRef.getDate());
      if (day) {
        return day.events;
      }
    }
    return [];
  }

  render() {
    return this.useLightningCard ? lightningCardTemplate : defaultTemplate;
  }

  connectedCallback() {
    this.loading = true;
  }
  @wire(getRecords, {
    parentRecordId: "$recordId",
    relatedListId: "$relatedListName",
    fields: [
      EVENT_SUBJECT_FIELD.fieldApiName,
      EVENT_START_DATE_FIELD.fieldApiName,
      EVENT_CREATED_DATE_FIELD.fieldApiName
    ],
    sortBy: EVENT_CREATED_DATE_FIELD.fieldApiName
  })
  wiredRelatedEvents(result) {
    const { error, data } = result;
    this.wiredEventResult = result;

    if (data) {
      this.eventData = data;

      this._processEventData(data);

      this.loading = false;
    } else if (error) {
      console.error("Error fetching related events:", error);
    }
  }

  _processEventData(eventData) {
    if (!eventData) {
      return;
    }

    // Map the event data to the calendar structure
    for (const record of eventData) {
      const eventDate = new Date(record[EVENT_START_DATE_FIELD.fieldApiName]);
      const week = this._getWeekForDate(eventDate);

      if (week) {
        week.days[eventDate.getDay()].events.push(record);
        week.days[eventDate.getDay()].css = this._setDayCss(
          week.days[eventDate.getDay()]
        );
      }
    }

    // refresh calendar
    this.generateCalendar(this.refDate, 0, this.eventData);
  }

  _getWeekForDate(dateRef) {
    if (dateRef instanceof Date === false) {
      dateRef = new Date(dateRef);
    }

    // Find the week that contains the given date
    return this.weeks.find((week) => {
      const startOfWeek = week.days[0].date;
      const endOfWeek = week.days[6].date;
      const isSameDate = dateRef >= startOfWeek && dateRef <= endOfWeek;
      return isSameDate;
    });
  }

  /**
   * Generates the calendar data structure for a given month.
   * @param {Date} [targetDate=new Date()] - The date to generate the calendar for. The month and year of this date will be used.
   * @param {number} [startOfWeek=0] - The starting day of the week (0 for Sunday, 1 for Monday, etc.).
   */
  generateCalendar(targetDate = new Date(), startOfWeek = 0, events = []) {
    const date = new Date(targetDate);
    const year = date.getFullYear();
    const month = date.getUTCMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const weeks = [];
    let currentWeek = { weekNumber: 1, days: [] };

    // Start date of the calendar view
    const startDate = new Date(firstDayOfMonth);
    const dayOfWeek = startDate.getDay();
    const diff = (dayOfWeek - startOfWeek + 7) % 7;
    startDate.setDate(startDate.getDate() - diff);

    // End date of the calendar view
    const endDate = new Date(lastDayOfMonth);
    const endDayOfWeek = endDate.getDay();
    const endDiff = 6 - ((endDayOfWeek - startOfWeek + 7) % 7);
    endDate.setDate(endDate.getDate() + endDiff);

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayDate = new Date(currentDate);
      const day = {
        date: dayDate,
        day: currentDate.getDate(),
        label: currentDate.getDate(),
        events: events.filter((event) => {
          const eventDate = new Date(
            event[EVENT_START_DATE_FIELD.fieldApiName]
          );
          const isMatch =
            eventDate.getUTCDate() === dayDate.getUTCDate() &&
            eventDate.getUTCMonth() === dayDate.getUTCMonth() &&
            eventDate.getUTCFullYear() === dayDate.getUTCFullYear();
          return isMatch;
        })
      };
      day.isCurrentMonth = currentDate.getMonth() === month;
      day.isToday =
        day.date.getUTCFullYear() === this.refDate.getUTCFullYear() &&
        day.date.getUTCMonth() === this.refDate.getUTCMonth() &&
        day.date.getUTCDate() === this.refDate.getUTCDate();

      day.css = this._setDayCss(day);

      currentWeek.days.push(day);

      if (currentWeek.days.length === 7) {
        weeks.push(currentWeek);

        currentWeek = { weekNumber: currentWeek.weekNumber + 1, days: [] };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.weeks = weeks;
  }

  _setDayCss(day) {
    const classes = [];

    if (day.isCurrentMonth) {
      if (day.events.length > 0) {
        classes.push("slds-is-selected");
      }

      if (day.isToday) {
        classes.push("slds-is-today");
      }
    } else {
      classes.push("slds-day_adjacent-month");
    }

    const result = classes.join(" ");
    return result;
  }

  async refreshHandler() {
    this.loading = true;

    await refreshApex(this.wiredEventResult);

    this.loading = false;
  }
}
