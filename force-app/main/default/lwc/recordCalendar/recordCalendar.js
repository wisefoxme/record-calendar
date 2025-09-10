import { api, track, LightningElement, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import USER_LOCALE from "@salesforce/i18n/locale";
import EVENT_CREATED_DATE_FIELD from "@salesforce/schema/Event.CreatedDate";
import EVENT_ID_FIELD from "@salesforce/schema/Event.Id";
import EVENT_START_DATE_FIELD from "@salesforce/schema/Event.StartDateTime";
import EVENT_SUBJECT_FIELD from "@salesforce/schema/Event.Subject";
import getRecords from "@salesforce/apex/CalendarController.getRecords";
import defaultTemplate from "./defaultTemplate";
import lightningCardTemplate from "./cardTemplate";

// #region labels

import NEXT_MONTH_LABEL from "@salesforce/label/c.wf_cal_NextMonth";
import PREVIOUS_MONTH_LABEL from "@salesforce/label/c.wf_cal_PreviousMonth";
import CHOOSE_A_DATE_LABEL from "@salesforce/label/c.wf_cal_ChooseADate";
import DATEPICKER_LABEL from "@salesforce/label/c.wf_cal_DatePicker";
import LOADING_LABEL from "@salesforce/label/c.wf_cal_Loading";
import DEFAULT_LABEL from "@salesforce/label/c.wf_cal_RecordEventCalendarLabel";
import REFRESH_LABEL from "@salesforce/label/c.wf_cal_Refresh";

// endregion

const LABELS = {
  NEXT_MONTH: NEXT_MONTH_LABEL,
  PREVIOUS_MONTH: PREVIOUS_MONTH_LABEL,
  CHOOSE_A_DATE: CHOOSE_A_DATE_LABEL,
  DATEPICKER: DATEPICKER_LABEL,
  LOADING: LOADING_LABEL,
  REFRESH: REFRESH_LABEL
};

export default class RecordCalendar extends LightningElement {
  @api iconName = "standard:event";
  @api recordId;
  @api refDate = new Date();
  @api relatedListName = "Events";
  @api title = DEFAULT_LABEL;
  @api useLightningCard = false;
  @api showEventCount = false;
  @api hideMonthPicker = false;
  @track weeks = [];
  eventData = [];
  wiredEventResult;
  loading = false;
  labels = LABELS;

  get localeMonthAndYear() {
    return new Intl.DateTimeFormat(USER_LOCALE, {
      year: "numeric",
      month: "long"
    }).format(new Date(this.refDate));
  }

  get formattedTitle() {
    if (this.showEventCount) {
      return `${this.title} (${this.eventData.length})`;
    }

    return this.title;
  }

  get showMonthPickerButtons() {
    return !this.hideMonthPicker;
  }

  @api
  get value() {
    return this.weeks;
  }

  @api
  getDateForEvent(eventId) {
    const result = this.eventData.find(
      (event) => event[EVENT_ID_FIELD.fieldApiName] === eventId
    )?.[EVENT_START_DATE_FIELD.fieldApiName];

    if (!result) {
      return null;
    }

    return new Date(result);
  }

  @api
  getEventsForDate(dateRef) {
    const result = this.eventData.filter((event) => {
      const eventDate = new Date(event[EVENT_START_DATE_FIELD.fieldApiName]);
      return (
        eventDate.getUTCFullYear() === dateRef.getUTCFullYear() &&
        eventDate.getUTCMonth() === dateRef.getUTCMonth() &&
        eventDate.getUTCDate() === dateRef.getUTCDate()
      );
    });

    return result;
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
    this._generateCalendar(this.refDate, 0, this.eventData);
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
  _generateCalendar(targetDate = new Date(), startOfWeek = 0, events = []) {
    const today = new Date();
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
        day.date.getUTCFullYear() === today.getUTCFullYear() &&
        day.date.getUTCMonth() === today.getUTCMonth() &&
        day.date.getUTCDate() === today.getUTCDate();

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

  // #region Buttons

  prevMonth() {
    this.refDate.setMonth(this.refDate.getMonth() - 1);
    this._generateCalendar(this.refDate, 0, this.eventData);
  }

  nextMonth() {
    this.refDate.setMonth(this.refDate.getMonth() + 1);
    this._generateCalendar(this.refDate, 0, this.eventData);
  }

  // #endregion
}
