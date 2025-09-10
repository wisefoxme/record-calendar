import { createElement } from "@lwc/engine-dom";
import RecordCalendar from "c/recordCalendar";
import USER_LOCALE from "@salesforce/i18n/locale";
import EVENT_ID_FIELD from "@salesforce/schema/Event.Id";
import EVENT_START_DATE_TIME_FIELD from "@salesforce/schema/Event.StartDateTime";
import EVENT_SUBJECT_FIELD from "@salesforce/schema/Event.Subject";
import getRecords from "@salesforce/apex/CalendarController.getRecords";

const SEP_FIFTEEN = new Date(2025, 8, 15);
const SEP_FIRST = new Date(2025, 8, 1);
const DUMMY_RECORD_ID = "001xx000003DGbYAAW";
const TEST_LOCALE = "ja-JP";
const EVENTS = [
  {
    [EVENT_ID_FIELD.fieldApiName]: "event-1",
    [EVENT_SUBJECT_FIELD.fieldApiName]: "Event 1",
    [EVENT_START_DATE_TIME_FIELD.fieldApiName]: SEP_FIRST.toISOString()
  },
  {
    [EVENT_ID_FIELD.fieldApiName]: "event-2",
    [EVENT_SUBJECT_FIELD.fieldApiName]: "Event 2",
    [EVENT_START_DATE_TIME_FIELD.fieldApiName]: SEP_FIFTEEN.toISOString()
  }
];

jest.mock(
  "@salesforce/i18n/locale",
  () => {
    return {
      default: TEST_LOCALE
    };
  },
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/CalendarController.getRecords",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return {
      default: createApexTestWireAdapter(jest.fn())
    };
  },
  { virtual: true }
);

jest.mock(
  "@salesforce/schema/Event.Id",
  () => ({ default: { fieldApiName: "Id" } }),
  { virtual: true }
);
jest.mock(
  "@salesforce/schema/Event.StartDateTime",
  () => ({ default: { fieldApiName: "StartDateTime" } }),
  { virtual: true }
);
jest.mock(
  "@salesforce/schema/Event.Subject",
  () => ({ default: { fieldApiName: "Subject" } }),
  { virtual: true }
);

describe("c-record-calendar", () => {
  afterEach(() => {
    // The jsdom instance is shared across test cases in a single file so reset the DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }

    jest.clearAllMocks();
  });

  describe("general rendering (default template)", () => {
    let element;

    beforeAll(async () => {
      element = createElement("c-record-calendar", {
        is: RecordCalendar
      });
      element.recordId = DUMMY_RECORD_ID;
      element.refDate = SEP_FIFTEEN;

      // Act
      document.body.appendChild(element);

      getRecords.emit(EVENTS);

      await Promise.resolve();
    });

    it('should use the default template if "use-lightning-card" is false', () => {
      const template = element.shadowRoot.querySelector("lightning-card");
      expect(template).toBeNull();
    });
  });

  describe("general rendering (lightning-card template)", () => {
    let element;

    beforeAll(async () => {
      element = createElement("c-record-calendar", {
        is: RecordCalendar
      });
      element.recordId = DUMMY_RECORD_ID;
      element.refDate = SEP_FIFTEEN;
      element.useLightningCard = true;

      // Act
      document.body.appendChild(element);

      getRecords.emit(EVENTS);

      await Promise.resolve();
    });

    it("should render a lightning-card when 'use-lightning-card' is true", () => {
      const template = element.shadowRoot.querySelector("lightning-card");
      expect(template).not.toBeNull();
    });

    it("should show the calendar title", () => {
      const title = element.shadowRoot.querySelector("lightning-card");
      expect(title.title).toBe(element.title);
    });
  });

  describe("general rendering", () => {
    let element;

    beforeAll(async () => {
      element = createElement("c-record-calendar", {
        is: RecordCalendar
      });
      element.recordId = DUMMY_RECORD_ID;
      element.refDate = SEP_FIFTEEN;
      element.useLightningCard = true;

      // Act
      document.body.appendChild(element);

      getRecords.emit(EVENTS);

      await Promise.resolve();
    });

    it('current day should have the "slds-is-today" class', () => {
      const dateTableCell =
        element.shadowRoot.querySelectorAll("td.slds-is-today");
      expect(dateTableCell).not.toBeNull();
      expect(dateTableCell.length).toBe(1);
    });

    it("should generate a calendar with five weeks, seven days each", () => {
      const weeks = element.value;
      expect(weeks).toHaveLength(5);
      weeks.forEach((week) => {
        expect(week.days).toHaveLength(7);
      });
    });

    it("should light up the two dates with events", () => {
      const days = element.value.flatMap((week) => week.days);
      const eventDays = days.filter((day) => day.events.length > 0);
      expect(eventDays).toHaveLength(2);
    });

    it("should have the selected class is applied to the dates that have an event", () => {
      const daysWithEvents = element.shadowRoot.querySelectorAll(
        "td.slds-is-selected"
      );
      expect(daysWithEvents).toHaveLength(2);
    });

    it("should show the current month's label", async () => {
      const monthNameElement = element.shadowRoot.querySelector(
        "h2[data-id='pickerDaySelected-month']"
      );
      const expectedLabel = new Intl.DateTimeFormat(TEST_LOCALE, {
        year: "numeric",
        month: "long"
      }).format(element.refDate);
      expect(USER_LOCALE).toBe(TEST_LOCALE);
      expect(monthNameElement).not.toBeNull();
      expect(monthNameElement.textContent).toBe(expectedLabel);
    });

    it("should show the previous and next month's buttons, and change months accordingly", async () => {
      const cal = createElement("c-record-calendar", {
        is: RecordCalendar
      });
      cal.recordId = DUMMY_RECORD_ID;
      cal.refDate = SEP_FIFTEEN;
      cal.useLightningCard = true;

      // Act
      document.body.appendChild(cal);

      getRecords.emit(EVENTS);

      await Promise.resolve();

      const prevButton = cal.shadowRoot.querySelector(
        "lightning-button-icon[data-id='prevMonthBtn']"
      );
      const nextButton = cal.shadowRoot.querySelector(
        "lightning-button-icon[data-id='nextMonthBtn']"
      );

      expect(prevButton).not.toBeNull();
      expect(nextButton).not.toBeNull();

      // on previous and next month's, when clicked, the numbers are reset
      // and slds-is-today isn't applied
      prevButton.click();
      await Promise.resolve();

      const augustMonthTitle = cal.shadowRoot.querySelector(
        "h2[data-id='pickerDaySelected-month']"
      );
      const expectedLabel = new Intl.DateTimeFormat(TEST_LOCALE, {
        year: "numeric",
        month: "long"
      }).format(cal.refDate);

      expect(augustMonthTitle).not.toBeNull();
      expect(augustMonthTitle.textContent).toBe(expectedLabel);

      const dateTableCellAugust =
        cal.shadowRoot.querySelectorAll("td.slds-is-today");

      expect(dateTableCellAugust).toHaveLength(0);

      nextButton.click();
      nextButton.click();
      await Promise.resolve();

      const dateTableCellOctober =
        cal.shadowRoot.querySelectorAll("td.slds-is-today");

      expect(dateTableCellOctober).toHaveLength(0);
    });
  });

  describe("interactions", () => {
    let element;

    beforeAll(async () => {
      element = createElement("c-record-calendar", {
        is: RecordCalendar
      });
      element.recordId = DUMMY_RECORD_ID;
      element.refDate = SEP_FIFTEEN;

      // Act
      document.body.appendChild(element);

      getRecords.emit(EVENTS);

      await Promise.resolve();
    });

    it("should return null when searching for an event that does not exist", () => {
      const eventDate = element.getDateForEvent("event-3");
      expect(eventDate).toBeNull();
    });

    it("should search for and return the event contained in a week", () => {
      const eventDate = element.getDateForEvent("event-1");
      expect(eventDate).not.toBeNull();

      // test only the date component, not the time
      // should be Monday, the second day of the week
      // (if it starts on Sundays)
      expect(eventDate.getFullYear()).toBe(2025);
      expect(eventDate.getMonth()).toBe(8);
      expect(eventDate.getDay()).toBe(1);
    });

    it("should return the list of events for a particular date", () => {
      const events = element.getEventsForDate(new Date(2025, 8, 15));
      expect(events).toHaveLength(1);
      expect(events[0][EVENT_ID_FIELD.fieldApiName]).toBe("event-2");
    });
  });
});
