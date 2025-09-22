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
        'SELECT Id, (SELECT ' +
        String.join(fields, ', ') +
        ' FROM ' +
        relatedListId +
        ') FROM ' +
        sot.getDescribe().getName() +
        ' WHERE Id = :parentRecordId' +
        ' ORDER BY ' +
        sortBy;
      Object result = Database.query(query.escapeJava())[0]
        .getSObjects(relatedListId);
      if (result == null) {
        return new List<SObject>();
      }
      return (List<SObject>) result;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
