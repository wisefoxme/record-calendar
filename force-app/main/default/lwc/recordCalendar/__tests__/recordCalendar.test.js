import { createElement } from "@lwc/engine-dom";
import { getFieldValue } from "lightning/uiRecordApi";
import { getRelatedListRecords } from "lightning/uiRelatedListApi";
import RecordCalendar from "c/RecordCalendar";
import EVENT_ID_FIELD from "@salesforce/schema/Event.Id";
import EVENT_START_DATE_TIME_FIELD from "@salesforce/schema/Event.StartDateTime";
import EVENT_SUBJECT_FIELD from "@salesforce/schema/Event.Subject";

const SEP_FIFTEEN = new Date(2025, 8, 15);
const SEP_FIRST = new Date(2025, 8, 1);

describe("c-record-calendar", () => {
  afterEach(() => {
    // The jsdom instance is shared across test cases in a single file so reset the DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  function emitEvents() {
    getRelatedListRecords.emit({
      records: [
        {
          id: "event-1",
          fields: {
            [EVENT_ID_FIELD.fieldApiName]: { value: "event-1" },
            [EVENT_SUBJECT_FIELD.fieldApiName]: { value: "Event 1" },
            [EVENT_START_DATE_TIME_FIELD.fieldApiName]: {
              value: SEP_FIRST
            }
          }
        },
        {
          id: "event-2",
          fields: {
            [EVENT_ID_FIELD.fieldApiName]: { value: "event-2" },
            [EVENT_SUBJECT_FIELD.fieldApiName]: { value: "Event 2" },
            [EVENT_START_DATE_TIME_FIELD.fieldApiName]: {
              value: SEP_FIFTEEN
            }
          }
        }
      ]
    });
  }

  it("should generate the correct array for the month of september of 2025", () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = "001xx000003DGbYAAW";
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    emitEvents();

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
    const expectedDate1 = new Date(2025, 7, 31);
    const expectedDate2 = new Date(2025, 8, 1);
    expect(dates[0].days[0].label).toBe(expectedDate1.getDate());
    expect(dates[0].days[1].label).toBe(expectedDate2.getDate());

    // current day should have the "slds-is-today" class
    const dateTableCell = element.shadowRoot.querySelectorAll(".slds-is-today");
    expect(dateTableCell).not.toBeNull();
    expect(dateTableCell.length).toBe(1);
  });

  it("should search for and return the event contained in a week", () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = "001xx000003DGbYAAW";
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    emitEvents();

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

  it("should return null when searching for an event that does not exist", () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = "001xx000003DGbYAAW";
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    emitEvents();

    // Assert
    const eventDate = element.getDateForEvent("event-3");
    expect(eventDate).toBeNull();
  });

  it("should return the list of events for a particular date", () => {
    // Arrange
    const element = createElement("c-record-calendar", {
      is: RecordCalendar
    });
    element.recordId = "001xx000003DGbYAAW";
    element.refDate = SEP_FIFTEEN;

    // Act
    document.body.appendChild(element);

    emitEvents();

    // Assert
    const events = element.getEventsForDate(SEP_FIFTEEN);
    expect(events).toHaveLength(1);
    expect(getFieldValue(events[0], EVENT_ID_FIELD)).toBe("event-2");
  });
});
