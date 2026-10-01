## Purpose

Defines how a user records what they spent and reviews it a week at a time: the weekly log and its day grouping, creating and amending entries, categorising them, managing the categories available, the totals shown, and the week boundary that determines which entries appear together. Analysis of that data over time belongs to the insights capability.

## Requirements

### Requirement: Weekly expense log

The Expenses destination SHALL present the expenses of exactly one week at a time, grouped under the calendar day each expense occurred on. Each day group SHALL show its date, and each entry within it SHALL show its description, its category, and its amount.

Day groups SHALL be ordered most recent day first, and entries within a day most recently created first, so the entry a user is most likely to be amending is the one nearest the top.

A day with no expenses SHALL NOT be shown as an empty group.

Entry amounts and day totals SHALL be aligned to one right edge shared across the whole log, forming a single column that holds its position from the top of the week to the bottom regardless of how long the descriptions beside it are.

#### Scenario: Week containing expenses

- **WHEN** the user views a week in which expenses were recorded on more than one day
- **THEN** each day that has at least one expense appears as a group labelled with its date
- **AND** the groups are ordered from the most recent day to the earliest
- **AND** every expense recorded on that day appears under its group showing description, category, and amount
- **AND** days within the week that have no expenses are absent from the list

#### Scenario: Amounts form one column

- **WHEN** the user views a week containing entries whose descriptions differ in length and whose amounts differ in number of digits
- **THEN** every entry amount and every day total shares the same right edge
- **AND** a description too long for its line wraps without displacing the amount beside it

#### Scenario: Week containing no expenses

- **WHEN** the user views a week in which no expenses were recorded
- **THEN** the screen states that nothing was recorded for that week
- **AND** the action for adding an expense remains available

### Requirement: Week navigation

The log SHALL open on the week containing today's date and SHALL let the user move to the preceding and following week without limit in either direction. The week currently being viewed SHALL be identified on screen by its date range, and the user SHALL be able to return to the current week directly.

Moving between weeks SHALL NOT change the vertical position at which the log's entries begin. Any control that is present for some weeks and absent for others SHALL continue to occupy its space when absent, so that no part of the log shifts as a consequence of navigating.

The transition between one week and the next SHALL carry the direction of travel, so that moving to an earlier week is visibly distinct from moving to a later one.

The user SHALL additionally be able to move between weeks by swiping the log horizontally, by touch or by dragging with a pointer: swiping toward the start of the reading direction moves to the following week, and swiping away from it moves to the preceding week, matching the direction the content itself travels.

The swipe SHALL be an addition to the on-screen controls, never a replacement for them. A gesture is invisible and undiscoverable on its own, and it is unavailable to a user navigating by assistive technology, so every week reachable by swiping SHALL remain reachable by the controls, and those controls SHALL be operable by keyboard.

Swiping SHALL NOT interfere with scrolling the log. A gesture that begins vertically SHALL scroll and SHALL NOT change the week, and a gesture too small or too slow to be deliberate SHALL leave the displayed week unchanged.

#### Scenario: Log opens on the current week

- **WHEN** the user opens the Expenses destination
- **THEN** the week containing today's date is displayed
- **AND** the displayed date range is the one that contains today

#### Scenario: Moving to an adjacent week

- **WHEN** the user moves to the previous or the following week
- **THEN** the log displays the expenses of that week, grouped by day
- **AND** the on-screen date range updates to the newly displayed week
- **AND** the transition indicates whether the new week is earlier or later than the one it replaced

#### Scenario: Swiping to an adjacent week

- **WHEN** the user swipes the log horizontally, far enough or fast enough for the gesture to be deliberate
- **THEN** the log moves to the preceding or the following week according to the direction swiped
- **AND** the same transition plays as when the on-screen controls are used

#### Scenario: Scrolling the log does not change the week

- **WHEN** the user drags the log vertically to scroll through a long week
- **THEN** the log scrolls
- **AND** the displayed week is unchanged

#### Scenario: An indecisive swipe

- **WHEN** the user begins a horizontal drag but releases it short of the distance and speed required
- **THEN** the displayed week is unchanged
- **AND** the log is left in its resting position

#### Scenario: Every week remains reachable without the gesture

- **WHEN** the user navigates using only the on-screen controls, including by keyboard alone or with a screen reader active
- **THEN** the preceding week, the following week, and the current week are all reachable
- **AND** no week is reachable only by swiping

#### Scenario: Navigating away from the current week does not move the log

- **WHEN** the user moves from the current week to the preceding week, causing the return-to-current-week control to appear
- **THEN** the first day group of the log occupies the same vertical position as it did before the move
- **AND** returning to the current week likewise leaves that position unchanged

#### Scenario: Returning to the current week

- **WHEN** the user has navigated away from the current week and chooses to return to it
- **THEN** the week containing today's date is displayed again

#### Scenario: Navigating to a week beyond any recorded data

- **WHEN** the user moves to a week in which no expenses were recorded
- **THEN** the empty-week state is shown for that week
- **AND** navigation to adjacent weeks remains available in both directions

### Requirement: The viewed week is shared with Insights

The week the expense log shows SHALL be the week the Insights destination shows. Any action that changes the week the log displays — the week controls, the swipe, the shortcut back to the current week, or saving an expense dated in another week — SHALL change the week Insights displays to the same one, and a change of week made on Insights SHALL likewise change the week the log displays.

Each destination SHALL keep its own controls for moving between weeks; sharing the week SHALL NOT remove week navigation from either.

#### Scenario: Navigating the log moves Insights

- **WHEN** the user moves the log to the preceding week and opens Insights
- **THEN** Insights shows that preceding week

#### Scenario: Navigating Insights moves the log

- **WHEN** the user moves Insights to another week and returns to the log
- **THEN** the log displays that week, grouped by day
- **AND** the log's on-screen date range names that week

#### Scenario: Saving into another week moves both

- **WHEN** the user saves an expense dated inside a week other than the one being viewed and then opens Insights
- **THEN** the log displays the week that contains the saved expense
- **AND** Insights shows that same week, with the saved expense included in its figures

#### Scenario: Viewing imported expenses moves both

- **WHEN** the user completes an import, chooses to view the imported expenses, and then opens Insights
- **THEN** the log displays the week the imported expenses begin in
- **AND** Insights shows that same week

### Requirement: Recording an expense

The user SHALL be able to record an expense by supplying a date, a description, an amount, and a category. On opening the entry form to create an expense, the date field SHALL be prefilled with today's date and SHALL remain editable to any other date.

On save, the expense SHALL be stored and SHALL appear under its date in the log.

#### Scenario: Date is prefilled with today

- **WHEN** the user opens the form to record a new expense
- **THEN** the date field shows today's date
- **AND** the description, amount, and category fields are empty or unselected

#### Scenario: Recording an expense dated today

- **WHEN** the user supplies a description, an amount, and a category, leaves the prefilled date unchanged, and saves
- **THEN** the expense is stored against today's date
- **AND** the log returns to the week containing today and shows the new expense under today's day group

#### Scenario: Changing the date before saving

- **WHEN** the user changes the prefilled date to a different date and saves
- **THEN** the expense is stored against the date the user chose, not today's date
- **AND** the expense appears under that date's day group

#### Scenario: Recording an expense outside the week being viewed

- **WHEN** the user is viewing one week and saves an expense dated inside a different week
- **THEN** the expense is stored against the date the user chose
- **AND** the log displays the week that contains the saved expense, so the entry the user just created is visible

#### Scenario: Abandoning entry

- **WHEN** the user opens the form to record an expense and dismisses it without saving
- **THEN** no expense is stored
- **AND** the log is unchanged

### Requirement: Editing an expense

Every field of a recorded expense — its date, description, amount, and category — SHALL be editable after the fact. The entry form SHALL open populated with the expense's current values.

Changing an expense's date SHALL move it to the day group for the new date, including when that date falls in a different week.

#### Scenario: Editing an expense's description or amount

- **WHEN** the user opens a recorded expense, changes its description or amount, and saves
- **THEN** the stored expense reflects the new values
- **AND** the entry displays the new values in the log
- **AND** the entry remains under the same day group

#### Scenario: Correcting an expense's date within the same week

- **WHEN** the user changes a recorded expense's date to another date in the same week and saves
- **THEN** the expense is removed from its previous day group and appears under the new date's group
- **AND** a previous day group left with no entries is no longer shown

#### Scenario: Correcting an expense's date into a different week

- **WHEN** the user changes a recorded expense's date to a date in a different week and saves
- **THEN** the expense no longer appears in the week it was moved out of
- **AND** the log displays the week that now contains the expense

#### Scenario: Abandoning an edit

- **WHEN** the user opens a recorded expense, changes one or more fields, and dismisses the form without saving
- **THEN** the stored expense retains its original values

### Requirement: Deleting an expense

The user SHALL be able to delete a recorded expense. Because deletion is not recoverable, the application SHALL ask the user to confirm before removing it.

#### Scenario: Confirming a deletion

- **WHEN** the user deletes an expense and confirms
- **THEN** the expense is removed from storage
- **AND** it no longer appears in the log
- **AND** its day group disappears if it held no other expenses

#### Scenario: Cancelling a deletion

- **WHEN** the user deletes an expense and declines the confirmation
- **THEN** the expense is retained unchanged
- **AND** it remains visible in the log

### Requirement: Expense categorisation

Every expense SHALL carry exactly one category, selected from the categories available in the application. The category SHALL be required: an expense SHALL NOT be saved without one.

The available categories SHALL consist of a fixed set of built-in categories, which the user can neither rename nor delete, together with any categories the user has created. Both kinds SHALL be offered for selection in the same way, and selecting one SHALL work identically regardless of which kind it is.

The built-in set SHALL include a general-purpose category for spending that fits none of the others, so a missing category never blocks recording an expense.

#### Scenario: Choosing a category

- **WHEN** the user is recording or editing an expense
- **THEN** the available categories are presented for selection
- **AND** the currently selected category, if any, is distinguishable from the rest

#### Scenario: Choosing a user-created category

- **WHEN** the user has created a category and is recording an expense
- **THEN** that category is offered for selection alongside the built-in ones
- **AND** selecting it and saving stores the expense under that category
- **AND** the expense appears in the log showing that category's name

#### Scenario: Attempting to save without a category

- **WHEN** the user tries to save an expense with no category selected
- **THEN** the expense is not saved
- **AND** the form indicates that a category is required

#### Scenario: Spending that fits no specific category

- **WHEN** the user records an expense that matches none of the specific categories
- **THEN** a general-purpose category is available to select
- **AND** the expense saves with it

### Requirement: Managing categories

The user SHALL be able to create a category, rename a category they created, and delete a category they created, from a category management surface reachable from settings.

That surface SHALL list every available category and SHALL make clear which ones the user can change. Built-in categories SHALL be presented without rename or delete actions, and no path in the application SHALL allow a built-in category to be renamed or deleted.

A created category SHALL persist across browser restarts and SHALL be available for selection everywhere categories are offered, without the user reopening a screen.

#### Scenario: Creating a category

- **WHEN** the user supplies a name for a new category and confirms
- **THEN** the category is created and appears in the list of categories
- **AND** it is available for selection the next time the user records or edits an expense

#### Scenario: Renaming a created category

- **WHEN** the user renames a category they created
- **THEN** the category keeps its identity and every expense filed under it remains filed under it
- **AND** the new name is what the log, the entry form, and the category list show

#### Scenario: Built-in categories cannot be changed

- **WHEN** the user views the category management surface
- **THEN** the built-in categories are listed
- **AND** no action to rename or delete a built-in category is offered

#### Scenario: Categories persist across restarts

- **WHEN** the user creates and renames categories, closes the browser, and opens the application again
- **THEN** the categories the user created are present with the names they were last given
- **AND** the built-in categories are unchanged

### Requirement: Category name validation

A category name SHALL NOT be saved unless it is non-empty after surrounding whitespace is removed, and SHALL NOT duplicate the name of another existing category, built-in or user-created, ignoring differences of letter case and surrounding whitespace. When a name is rejected, the application SHALL say why and SHALL retain what the user typed.

Renaming a category to its own current name SHALL be accepted rather than rejected as a duplicate.

#### Scenario: Empty name

- **WHEN** the user tries to save a category whose name is empty or only whitespace
- **THEN** the category is not created or renamed
- **AND** the application indicates that a name is required

#### Scenario: Duplicate name

- **WHEN** the user tries to save a category whose name matches an existing category's name, differing only in letter case or surrounding whitespace
- **THEN** the category is not created or renamed
- **AND** the application indicates that a category with that name already exists
- **AND** the name the user typed is still present for them to correct

#### Scenario: Renaming without changing the name

- **WHEN** the user opens the rename action for a category and confirms the name unchanged
- **THEN** the name is accepted and the category is unaffected

### Requirement: Deleting a category preserves its expenses

Deleting a user-created category SHALL NOT delete any expense. Before a category that has expenses filed under it is deleted, the user SHALL choose which of the remaining categories those expenses move to, and SHALL be told how many expenses are affected.

The reassignment and the deletion SHALL take effect together: after the operation the deleted category is absent and every affected expense carries the chosen category. If the operation cannot be completed, neither the reassignment nor the deletion SHALL take effect, and the category SHALL remain with its expenses intact.

Only the expenses' category SHALL change; their date, description, and amount SHALL be untouched, and day and week totals SHALL be unchanged by the operation.

#### Scenario: Deleting a category that has expenses

- **WHEN** the user deletes a category that has expenses filed under it
- **THEN** the user is told how many expenses are affected and is asked which category they should move to
- **AND** on confirming a choice, the category is removed and every affected expense carries the chosen category
- **AND** no expense is deleted, and no expense's date, description, or amount changes

#### Scenario: Abandoning a deletion

- **WHEN** the user starts deleting a category with expenses and dismisses the prompt without choosing a replacement
- **THEN** the category still exists
- **AND** its expenses are still filed under it

#### Scenario: Deleting an unused category

- **WHEN** the user deletes a user-created category that no expense uses
- **THEN** the category is removed
- **AND** no expense is affected

#### Scenario: Log reflects a deletion

- **WHEN** the user deletes a category whose expenses appear in the week being viewed
- **THEN** those expenses appear in the log under the replacement category
- **AND** the day and week totals are the same as before the deletion

### Requirement: Entry validation

An expense SHALL NOT be saved unless it has a non-empty description and an amount greater than zero. When a save is rejected, the application SHALL indicate which field is at fault and SHALL retain what the user has already entered.

#### Scenario: Saving with an empty description

- **WHEN** the user tries to save an expense whose description is empty or only whitespace
- **THEN** the expense is not saved
- **AND** the form indicates that a description is required
- **AND** the amount, date, and category the user already supplied are still populated

#### Scenario: Saving with a missing or non-positive amount

- **WHEN** the user tries to save an expense whose amount is empty, zero, or negative
- **THEN** the expense is not saved
- **AND** the form indicates that an amount greater than zero is required

#### Scenario: Amount with a fractional part

- **WHEN** the user enters an amount that includes a fractional currency part
- **THEN** the amount is stored and displayed to that precision without rounding error

### Requirement: Day and week totals

The log SHALL display the summed amount of every expense in each day group, and the summed amount of every expense in the week being viewed. Both totals SHALL update whenever an expense in that scope is added, edited, or deleted.

The week total SHALL be the most visually prominent figure on the Expenses destination: it SHALL be set larger than any other text on that screen, and no other element on the screen SHALL be given greater emphasis. It answers the question the destination exists to answer, and it SHALL be legible without the user reading any other part of the screen.

The week total SHALL be presented as the closing line of the week it sums, separated from the entries beneath it by the rule the visual system reserves for a total closing its entries.

Each day group SHALL likewise be separated from the entries beneath it by a hairline, so that a day's total reads as belonging to the entries it sums rather than floating between two groups.

#### Scenario: Totals shown for a populated week

- **WHEN** the user views a week containing expenses
- **THEN** each day group displays the sum of the expenses within it
- **AND** the screen displays the sum of every expense in the week
- **AND** the week's sum is the largest text on the screen

#### Scenario: Week total is marked as a closing figure

- **WHEN** the user views the Expenses destination
- **THEN** the closing rule separates the week total from the day groups it sums
- **AND** that rule appears nowhere else on the screen
- **AND** each day heading is separated from its own entries by a lighter hairline

#### Scenario: Totals after a change

- **WHEN** the user adds, edits the amount of, or deletes an expense in the week being viewed
- **THEN** the affected day total and the week total both reflect the change without the user reopening the screen

#### Scenario: Total for a week with no expenses

- **WHEN** the user views a week in which no expenses were recorded
- **THEN** the week total is shown as zero

### Requirement: Expenses persist in the browser

Recorded expenses SHALL be stored in the browser the application is opened in and SHALL remain available after the page is reloaded and after the browser is closed and reopened. Storage SHALL be local: no expense data leaves the device, and no network connection is required to record or read expenses.

Data is held per browser: it is not shared with other browsers or devices, and clearing the site's data in the browser removes it. The application SHALL say so where the user can find it, and SHALL ask the browser to keep its storage from being evicted.

A change made in one open tab of the application SHALL appear in any other open tab without a reload.

#### Scenario: Data survives a restart

- **WHEN** the user records expenses, closes the browser, and opens the application again
- **THEN** every recorded expense is still present with its date, description, amount, and category unchanged

#### Scenario: Recording while offline

- **WHEN** the device has no network connectivity
- **THEN** the user can record, edit, and delete expenses as normal
- **AND** no network-error state is shown

#### Scenario: The user is told where their data lives

- **WHEN** the user opens the settings surface
- **THEN** it states that expenses are stored in this browser only and that clearing the site's data deletes them

#### Scenario: First visit before any expense exists

- **WHEN** the user opens the application in a browser where no expense has ever been recorded
- **THEN** the current week is displayed in its empty state
- **AND** no error is shown

### Requirement: Configurable week start

The day on which a week begins SHALL be configurable by the user, defaulting to Monday. The chosen day SHALL determine the boundaries of every week the log displays and the scope of the week total. The setting SHALL persist across browser restarts.

Changing the setting SHALL regroup existing expenses without altering any expense's stored date.

#### Scenario: Default week boundary

- **WHEN** the user opens the log without ever having changed the week-start setting
- **THEN** the displayed week runs from Monday to Sunday

#### Scenario: Changing the week start

- **WHEN** the user changes the week-start day to a different day of the week
- **THEN** the log's displayed date range shifts to weeks beginning on that day
- **AND** expenses are regrouped into the weeks those new boundaries produce
- **AND** no expense's own date is changed

#### Scenario: Week start persists

- **WHEN** the user changes the week-start day, closes the browser, and opens the application again
- **THEN** the log still uses the week-start day the user chose

#### Scenario: Reaching the setting

- **WHEN** the user opens the settings surface from the Expenses destination
- **THEN** the week-start day setting is available with the current value shown
- **AND** dismissing the settings surface returns the user to the log
