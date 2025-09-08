# Calendar Lightning Web Component

This repository contains the implementation of a Lightning Web Component for displaying data in a calendar in Salesforce.

## Installation

### Option 1: With the Salesfoce CLI only

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run the following command to push the code to your Salesforce org:

   ```
   sf project deploy start
   ```

> [!WARNING]
>
> This command will deploy your local changes to the Scratch Org.

### Option 2: Using NPM and the Salesforce CLI

1. Using NPM, make sure you have the Salesforce CLI installed globally on your machine:

   ```
   npm install -g  @salesforce/cli
   ```

2. Also using NPM, install the package with:

   ```
   npm install --save-dev @wisefoxme/record-calendar
   ```

3. Authenticate to your Salesforce org using the Salesforce CLI, and deploy it as in option 1.

## TODOs

- [ ] Implement event creation
- [ ] Add support for time zones
- [x] Implement controls for viewing other months and years
- [x] Add labels for translations
- [ ] Add option to show event count
