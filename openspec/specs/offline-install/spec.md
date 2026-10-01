## Purpose

Defines what the application guarantees once it has been visited: that it opens and works in full with no network, that it can be installed and behaves as an application of its own when it is, and how a newer version reaches someone who already has an older one. What each destination shows is specified by the capability that owns it; this capability specifies that it is available.

## Requirements

### Requirement: The whole application is available offline after a first visit

Once the application has been opened in a browser with a network connection and has finished loading, the application SHALL open in that browser with no network connection, and every destination and every page reachable from one SHALL be available — including pages the user has never opened.

Availability offline SHALL NOT depend on which pages were visited while online. A user who opened only the Expenses destination before losing their connection SHALL be able to reach Insights, Data, the entry form, settings, category management, and the import with no network.

Opening the application offline at the address of any of its pages SHALL display that page.

The application SHALL NOT present a notice that the device is currently offline, a network-error state, or a degraded mode: nothing it does requires a network, so being offline is not a condition the user needs to be told about. This is distinct from telling the user that the application has been saved for offline use, which a separate requirement covers.

#### Scenario: Opening with no network

- **WHEN** the user has opened the application once while online, loses their network connection, and opens the application again
- **THEN** the Expenses destination is displayed exactly as it is online
- **AND** no network-error state or offline indicator is shown

#### Scenario: Reaching a page never opened before

- **WHEN** the user opened only the Expenses destination while online, and with no network opens Insights, the entry form, settings, and the import
- **THEN** each of them is displayed and works as it does online

#### Scenario: Opening a page's own address offline

- **WHEN** the user, with no network, opens the application at the address of a page other than the default destination
- **THEN** that page is displayed

#### Scenario: Recording while offline

- **WHEN** the user records, edits, and deletes expenses with no network, and later opens the application with a network
- **THEN** everything recorded offline is present and unchanged

#### Scenario: A first visit that never completed

- **WHEN** the user opens the application for the first time and loses their connection before it has finished loading
- **THEN** the application is not yet guaranteed to open offline
- **AND** it becomes available offline after the next visit that completes with a network

### Requirement: The application says when it is ready for offline use

Saving the application for offline use takes time after a first visit, and until it has finished the application is not guaranteed to open without a network. The application SHALL tell the user when it has finished, so that they know the moment from which they can rely on it offline.

That notice SHALL be shown once, the first time the application becomes available offline in a browser. It SHALL NOT be shown again on later visits, and SHALL NOT be shown when a newer version replaces an older one — that is an update, which has its own notice. It SHALL NOT require any action, SHALL NOT obstruct what the user is doing, and SHALL be perceivable by assistive technology.

Because a notice shown once can be missed, the application SHALL also state its current offline availability in the settings surface, as one of: being saved for offline use, available offline, or not available offline in this browser. That statement SHALL change from being saved to available without the user reopening the surface.

While the application is still being saved it SHALL remain fully usable; saving SHALL NOT block or delay any interaction.

Where the browser cannot keep the application for offline use at all, the application SHALL say so in the settings surface rather than leaving the state as being saved indefinitely, and SHALL NOT show the ready notice.

#### Scenario: Saving finishes on a first visit

- **WHEN** the user opens the application for the first time with a network connection and the application finishes being saved for offline use
- **THEN** a notice states that the application is ready to be used offline
- **AND** the notice goes away without the user acting on it
- **AND** nothing the user was doing is interrupted

#### Scenario: Using the application while it is being saved

- **WHEN** the application is still being saved for offline use
- **THEN** the user can record, edit, and browse expenses as normal

#### Scenario: Later visits

- **WHEN** the user opens the application in a browser where it is already available offline
- **THEN** no ready notice is shown

#### Scenario: Checking the state in settings

- **WHEN** the user opens the settings surface after the application has been saved
- **THEN** it states that the application is available offline

#### Scenario: Settings open while saving finishes

- **WHEN** the settings surface is open and states that the application is being saved, and saving finishes
- **THEN** the statement changes to say the application is available offline, without the surface being reopened

#### Scenario: A browser that cannot keep the application

- **WHEN** the user opens the application in a browser or browsing mode that does not allow it to be kept for offline use
- **THEN** no ready notice is shown
- **AND** the settings surface states that the application is not available offline in this browser

#### Scenario: An update is not announced as becoming ready

- **WHEN** a newer version is obtained in a browser where the application was already available offline
- **THEN** the ready notice is not shown
- **AND** the update notice is shown instead

### Requirement: The application can be installed

The application SHALL meet the browser's criteria for installation, so that a browser which offers to install web applications offers to install this one. It SHALL declare a name, a short name, icons at sizes suitable for a home screen and for a splash screen including an icon that survives being masked to a platform's shape, and colours for its window chrome.

When installed, the application SHALL open in a window of its own without the browser's address bar, on the Expenses destination.

The installed application SHALL show the same expenses, categories, and settings as the application opened in a tab of the browser it was installed from. Installing SHALL NOT create a second, empty set of data, and SHALL NOT be required: every capability SHALL remain available in an ordinary browser tab.

#### Scenario: The browser offers installation

- **WHEN** the user opens the application in a browser that supports installing web applications
- **THEN** the browser's own install action is available for it
- **AND** the application is identified by its name and its icon

#### Scenario: Opening the installed application

- **WHEN** the user opens the installed application
- **THEN** it opens in its own window without the browser's address bar
- **AND** the Expenses destination is displayed

#### Scenario: Installed application and browser tab share data

- **WHEN** the user records an expense in a browser tab, installs the application from that browser, and opens the installed application
- **THEN** the expense recorded in the tab is present

#### Scenario: The installed application offline

- **WHEN** the user opens the installed application with no network
- **THEN** it opens and works in full, as the requirement for offline availability states

#### Scenario: Icon on a platform that masks icons

- **WHEN** the application's icon is displayed by a platform that crops icons to its own shape
- **THEN** the icon's mark remains wholly visible within the cropped shape

### Requirement: A new version is offered, not imposed

When a newer version of the application has been published and the user opens the application with a network connection, the application SHALL obtain the newer version without interrupting what the user is doing, and SHALL then tell the user that an update is ready and offer to reload.

The newer version SHALL NOT replace the running one until the user accepts. Until then the version already running SHALL continue to work in full, so that an update can never discard an entry the user is part-way through.

Accepting SHALL reload the application into the newer version. If the offer is dismissed or ignored, the application SHALL continue on the version already running, and the newer version SHALL be in use the next time the application is opened after every window of it has been closed.

Where the application is open in more than one window, accepting in one SHALL bring every window onto the newer version, rather than leaving windows of one application running different versions.

The offer SHALL be perceivable by assistive technology and operable by keyboard.

#### Scenario: An update is published while the user has an older version

- **WHEN** a newer version has been published and the user opens the application with a network connection
- **THEN** the application opens on the version it already had, without delay
- **AND** once the newer version has been obtained, a notice states that an update is ready and offers to reload

#### Scenario: Accepting the update

- **WHEN** the user accepts the offer to reload
- **THEN** the application reloads
- **AND** the newer version is the one running afterwards
- **AND** the offer is no longer shown

#### Scenario: Not accepting the update

- **WHEN** the user dismisses or ignores the offer and continues using the application
- **THEN** the version already running continues to work in full
- **AND** nothing the user has typed is lost

#### Scenario: Picking up the update later

- **WHEN** the user did not accept an offered update, closes every window of the application, and opens it again
- **THEN** the newer version is the one running

#### Scenario: Several windows open

- **WHEN** the application is open in two windows and the user accepts the update in one
- **THEN** both windows end up on the newer version

#### Scenario: No update available

- **WHEN** the user opens the application and no newer version has been published
- **THEN** no update notice is shown

#### Scenario: Checking for an update while offline

- **WHEN** the user opens the application with no network
- **THEN** no update notice and no error about updating is shown

### Requirement: Updating never alters recorded data

Obtaining and applying a newer version of the application SHALL replace only the application itself. Expenses, categories, and settings recorded before an update SHALL be present and unchanged after it.

#### Scenario: Data survives an update

- **WHEN** the user has recorded expenses, created categories, and changed the week-start day, and then accepts an update
- **THEN** every expense, every category, and the week-start setting are as they were before the update
