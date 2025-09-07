public with sharing class CalendarController {
  @AuraEnabled(cacheable=true)
  public static List<SObject> getRecords(
    Id parentRecordId,
    String relatedListId,
    List<String> fields,
    String sortBy
  ) {
    try {
      // Query the related records
      Schema.SObjectType sot = parentRecordId.getSobjectType();
      String query =
        'SELECT (SELECT ' +
        String.join(fields, ', ') +
        ' FROM ' +
        relatedListId +
        ') FROM ' +
        sot.getDescribe().getName() +
        ' WHERE Id = :parentRecordId' +
        ' ORDER BY ' +
        sortBy;
      return Database.query(query.escapeJava())[0].getSObjects(relatedListId);
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
