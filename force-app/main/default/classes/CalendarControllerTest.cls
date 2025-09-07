@IsTest
private class CalendarControllerTest {
  @IsTest
  static void test() {
    // Test data setup
    Account account = new Account(Name = 'Test Account');
    insert account;

    Event event = new Event(
      Subject = 'Test Event',
      StartDateTime = System.now(),
      EndDateTime = System.now().addHours(1),
      WhatId = account.Id
    );
    insert event;

    // Actual test
    Test.startTest();

    List<SObject> results = CalendarController.getRecords(
      account.Id,
      'Events',
      new List<String>{ 'Subject', 'StartDateTime', 'CreatedDate' },
      'CreatedDate'
    );

    Test.stopTest();

    // Asserts
    Assert.areEqual(1, results.size(), 'Expected one event to be returned');
    Assert.areEqual(
      'Test Event',
      results[0].get('Subject'),
      'Expected event subject to match'
    );
    Assert.areNotEqual(
      null,
      results[0].get('StartDateTime'),
      'Expected StartDateTime to be populated'
    );
    Assert.areNotEqual(
      null,
      results[0].get('CreatedDate'),
      'Expected CreatedDate to be populated'
    );
  }
}
