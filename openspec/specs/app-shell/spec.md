## Purpose

Defines the application's shell as it loads in a web browser: what a user sees when the app opens, the top-level destinations available to them, and how moving between those destinations behaves. The content of each destination is specified by the capability that owns it — `expense-tracking` for Expenses, `spending-insights` for Insights, `data-import` for Data.

## Requirements

### Requirement: Application loads to a usable shell

The application SHALL load in a current desktop or mobile browser and render its shell without error, with no account, sign-in, or initial configuration required.

Once the application has been loaded in a browser, it SHALL open and remain fully usable in that browser with no network connection.

#### Scenario: First visit in a browser with no prior app data

- **WHEN** the user opens the application for the first time in a browser
- **THEN** the shell renders
- **AND** no sign-in, onboarding, or permission prompt is presented

#### Scenario: Opening while offline

- **WHEN** the user has loaded the application before, the device has no network connectivity, and the user opens the application again
- **THEN** the shell renders identically to an online load
- **AND** no network-error state is shown
- **AND** every destination and every page reachable from it can be opened

### Requirement: Top-level navigation destinations

The shell SHALL present exactly three top-level destinations, **Expenses**, **Insights**, and **Data**, via a persistent tab bar. Each tab SHALL display a text label and an icon, and the tab bar SHALL be visible on every top-level destination.

Each destination SHALL have its own address, so that the browser's back and forward controls move between destinations and a destination can be opened directly.

#### Scenario: Tab bar is present on each destination

- **WHEN** the user is viewing any top-level destination
- **THEN** a tab bar is visible listing Expenses, Insights, and Data
- **AND** the tab representing the current destination is visually distinguished from the others by more than colour alone

#### Scenario: Switching destinations

- **WHEN** the user activates the tab of a destination that is not currently active
- **THEN** the application displays that destination
- **AND** that tab becomes the visually distinguished one

#### Scenario: Activating the active tab

- **WHEN** the user activates the tab of the destination already being displayed
- **THEN** the application remains on that destination and does not navigate away

#### Scenario: Three tabs at an enlarged text size

- **WHEN** the browser's text size is increased above the default
- **THEN** all three tab labels remain readable without being clipped or overlapping

#### Scenario: Navigating by keyboard

- **WHEN** the user moves through the shell using only the keyboard
- **THEN** every tab can be focused and activated
- **AND** the focused control is visibly indicated

### Requirement: Expenses is the default destination

On opening the application at its root address the shell SHALL display the Expenses destination.

#### Scenario: Destination shown on opening

- **WHEN** the application finishes loading at its root address
- **THEN** the Expenses destination is displayed and its tab is the active one

### Requirement: Shell adapts to how it is being viewed

The shell SHALL honour the light and dark appearance the browser reports, remain legible at the browser's default and enlarged text sizes and at page zoom up to 200%, and adapt to the width of the viewport from a phone to a desktop window.

Content that is reachable at the default text size SHALL remain reachable at every enlarged size. Where enlarging text makes a page's content taller than the space available to it, that page SHALL scroll rather than clipping the content that no longer fits.

On a wide viewport, content SHALL be held to a readable column rather than stretched to the full width of the window.

Where the display has a cutout or a system indicator, as on a phone, no shell content SHALL be obscured by it.

#### Scenario: Browser reports a dark appearance

- **WHEN** the browser reports a dark colour scheme and the user opens the application
- **THEN** the shell renders with its dark palette
- **AND** all shell text meets a contrast ratio of at least 4.5:1 against its background

#### Scenario: Enlarged text size

- **WHEN** the browser's text size is increased above the default, or the page is zoomed
- **THEN** shell text scales accordingly
- **AND** tab labels remain readable without being clipped

#### Scenario: A destination's content outgrows the viewport

- **WHEN** the page is zoomed to 200% and the user views a destination whose content then exceeds the available height
- **THEN** the destination scrolls
- **AND** every element that was reachable at the default size can still be reached and activated

#### Scenario: A wide viewport

- **WHEN** the application is displayed in a desktop-width window
- **THEN** each destination's content is laid out in a centred column of readable width
- **AND** the tab bar remains available
