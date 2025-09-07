import { createElement } from "@lwc/engine-dom";
import RecordCalendar from "c/RecordCalendar";
import EVENT_ID_FIELD from "@salesforce/schema/Event.Id";
import EVENT_START_DATE_TIME_FIELD from "@salesforce/schema/Event.StartDateTime";
import EVENT_SUBJECT_FIELD from "@salesforce/schema/Event.Subject";
import getRecords from "@salesforce/apex/CalendarController.getRecords";

const SEP_FIFTEEN = new Date(2025, 8, 15);
const SEP_FIRST = new Date(2025, 8, 1);
const DUMMY_RECORD_ID = "001xx000003DGbYAAW";
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
  "@salesforce/apex/CalendarController.getRecords",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return {
      default: createApexTestWireAdapter(jest.fn())
    };
  },
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

  it("should generate the correct array for the month of september of 2025", async () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = DUMMY_RECORD_ID;
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    getRecords.emit(EVENTS);

    await Promise.resolve();

    // Assert
    const dates = element.value;

    expect(dates).not.toBeNull();

    // asserts that there are five rows, with seven days on each
    expect(dates).toHaveLength(5);

    dates.forEach((week) => {
      expect(week.days).toHaveLength(7);
    });

    // september of 2025 has 30 days through 5 weeks and starts in a Monday
    expect(dates[0].days.length).toBe(7);
    expect(dates[0].days[0].day).toBe(31);
    expect(dates[0].days[1].day).toBe(1);

    // the last elements are dates from october
    expect(dates[4].days[5].day).toBe(3);
    expect(dates[4].days[6].day).toBe(4);

    // assert it generates the days with labels on screen
    const expectedDate1 = new Date(2025, 7, 31); // august 31st
    const expectedDate2 = new Date(2025, 8, 1); // september 1st
    expect(dates[0].days[0].label).toBe(expectedDate1.getDate());
    expect(dates[0].days[1].label).toBe(expectedDate2.getDate());

    // the two dates should have events
    expect(dates[0].days[1].events).toHaveLength(1); // september 1st events
    expect(dates[2].days[1].events).toHaveLength(1); // september 15th events

    // current day should have the "slds-is-today" class
    const dateTableCell =
      element.shadowRoot.querySelectorAll("td.slds-is-today");
    expect(dateTableCell).not.toBeNull();
    expect(dateTableCell.length).toBe(1);

    // assert that the selected class is applied to the dates that have an event
    const daysWithEvents = element.shadowRoot.querySelectorAll(
      "td.slds-is-selected"
    );
    expect(daysWithEvents).toHaveLength(2);
  });

  it("should return null when searching for an event that does not exist", () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = DUMMY_RECORD_ID;
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    getRecords.emit(EVENTS);

    // Assert
    const eventDate = element.getDateForEvent("event-3");
    expect(eventDate).toBeNull();
  });

  it("should search for and return the event contained in a week", () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = DUMMY_RECORD_ID;
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    getRecords.emit(EVENTS);

    // Assert
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
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = DUMMY_RECORD_ID;
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    getRecords.emit(EVENTS);

    // Assert
    const events = element.getEventsForDate(SEP_FIFTEEN);
    expect(events).toHaveLength(1);
    expect(events[0][EVENT_ID_FIELD.fieldApiName]).toBe("event-2");
  });
});
