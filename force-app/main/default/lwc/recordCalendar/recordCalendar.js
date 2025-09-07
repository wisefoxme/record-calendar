import { getRelatedListRecords } from "lightning/uiRelatedListApi";
import { getFieldValue } from "lightning/uiRecordApi";
import { api, LightningElement, wire } from "lwc";
import EVENT_SUBJECT_FIELD from "@salesforce/schema/Event.Subject";
import EVENT_START_DATE_FIELD from "@salesforce/schema/Event.StartDateTime";
import EVENT_ID_FIELD from "@salesforce/schema/Event.Id";
import EVENT_CREATED_DATE_FIELD from "@salesforce/schema/Event.CreatedDate";

export default class RecordCalendar extends LightningElement {
  @api recordId;
  @api refDate = new Date();
  @api relatedListName = "Events";

  weeks = [];

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
          (e) => getFieldValue(e, EVENT_ID_FIELD) === eventId
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

  @wire(getRelatedListRecords, {
    parentRecordId: "$recordId",
    relatedListId: "$relatedListName",
    fields: [
      EVENT_SUBJECT_FIELD.fieldApiName,
      EVENT_START_DATE_FIELD.fieldApiName,
      EVENT_CREATED_DATE_FIELD.fieldApiName
    ],
    sortBy: [EVENT_CREATED_DATE_FIELD.fieldApiName]
  })
  wiredRelatedEvents({ error, data }) {
    if (data) {
      this._processEventData(data);
    } else if (error) {
      console.error("Error fetching related events:", error);
    }
  }

  _processEventData(eventData) {
    if (!eventData || !eventData.records) {
      return;
    }

    // Map the event data to the calendar structure
    for (const record of eventData.records) {
      const eventDate = getFieldValue(record, EVENT_START_DATE_FIELD);
      const week = this._getWeekForDate(eventDate);

      if (week) {
        week.days[eventDate.getDay()].events.push(record);
      }
    }
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
      // console.log(startOfWeek, endOfWeek, dateRef, isSameDate);
      return isSameDate;
    });
  }

  connectedCallback() {
    // on load, the component generates the calendar list of items for the weeks
    // on the current month and its days on the week.
    this.generateCalendar();
  }

  /**
   * Generates the calendar data structure for a given month.
   * @param {Date} [targetDate=new Date()] - The date to generate the calendar for. The month and year of this date will be used.
   * @param {number} [startOfWeek=0] - The starting day of the week (0 for Sunday, 1 for Monday, etc.).
   */
  generateCalendar(targetDate = new Date(), startOfWeek = 0) {
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
      const day = {
        date: new Date(currentDate),
        day: currentDate.getDate(),
        label: currentDate.getDate(),
        events: []
      };
      day.isCurrentMonth = currentDate.getMonth() === month;
      day.isToday =
        day.date.getUTCFullYear() === this.refDate.getUTCFullYear() &&
        day.date.getUTCMonth() === this.refDate.getUTCMonth() &&
        day.date.getUTCDate() === this.refDate.getUTCDate();

      day.css = this._getDayCss(day);

      currentWeek.days.push(day);

      if (currentWeek.days.length === 7) {
        weeks.push(currentWeek);

        currentWeek = { weekNumber: currentWeek.weekNumber + 1, days: [] };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Preserve existing events when regenerating the calendar
    if (this.weeks && this.weeks.length > 0) {
      for (let i = 0; i < weeks.length; i++) {
        if (this.weeks[i]) {
          for (let j = 0; j < weeks[i].days.length; j++) {
            const oldDay = this.weeks[i].days[j];
            const newDay = weeks[i].days[j];
            // If the dates match, preserve the events
            if (
              oldDay &&
              newDay &&
              oldDay.date.getTime() === newDay.date.getTime()
            ) {
              newDay.events = oldDay.events;
            }
          }
        }
      }
    }
    this.weeks = weeks;
  }

  _getDayCss(day) {
    return day.isCurrentMonth
      ? day.isToday
        ? "slds-is-today"
        : "slds-day"
      : "slds-day_adjacent-month";
  }
}
