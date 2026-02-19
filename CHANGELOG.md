# Changelog

All notable changes to the New Teachers App will be documented in this file.

## v.0.0.38.00 — Production Release
Date: 2026-01-26
Type: Production

### Release Summary
- Evaluation tags: #evaluationReady and #evaluationDone equivalent, "Give Evaluation" indicator
- No longer modifies Google Calendar event colors when reading
- Status colors override demo/owner styling when lesson ended

---

## v.0.0.37.05 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Evaluation ready/done indicator label: Give Evaluation

### Changes (detailed)

#### Changed
- Index.html
  - evaluationReady indicator text
    - From: "Evaluation Done"
    - To: "Give Evaluation"

---

## v.0.0.37.04 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Stop modifying Google Calendar event colors when reading; #evaluationReady and #evaluationDone treated as equivalent

### Changes (detailed)

#### Changed
- Code.js
  - fetchAndCacheTodayLessons()
    - From: Called changeEventColor() on events with evaluation tags (red/green/gray)
    - To: No longer modifies Google Calendar; only reads tags for app display
  - hasEvaluationReady
    - From: Only #evaluationReady
    - To: #evaluationReady OR #evaluationDone (equivalent)
  - Removed: hasEvaluationDone, evaluationDone from flat/grouped/sheet
- Index.html
  - evaluationReady indicator
    - From: "Give Evaluation" for #evaluationReady, separate "Evaluation Done" for #evaluationDone
    - To: Single "Evaluation Done" indicator for both tags
  - Removed: .evaluation-done CSS, evaluation-done marker

---

## v.0.0.37.03 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Added #evaluationDone tag support alongside #evaluationReady and #evaluationDue

### Changes (detailed)

#### Added
- Code.js
  - hasEvaluationDone from #evaluationDone in event description
  - evaluationDone in flat items, grouped lessons, lessons_today sheet
  - changeEventColor: gray for evaluationDone (takes precedence over ready/due)
- Index.html
  - .evaluation-done CSS (grey indicator)
  - Evaluation Done indicator on cards when e.evaluationDone

---

## v.0.0.37.02 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Status colors now override demo/owner styling when lesson has ended

### Changes (detailed)

#### Fixed
- Index.html
  - .event-block.danger, .event-block.caution, .event-block.safe
    - From: Defined before .event-block.demo and .event-block.owner; demo/owner overrode status colors (cards stayed blue/dark when pdf+history complete)
    - To: Status rules moved after demo/owner so danger/caution/safe override; demo/owner lessons now show correct green/orange/red when ended

---

## v.0.0.37.01 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Status classes renamed to danger/caution/safe; instant color update after actions

### Changes (detailed)

#### Changed
- Index.html
  - .event-block.uploaded/history/complete
    - From: uploaded, history, complete
    - To: danger, caution, safe
  - PDF upload & lesson history success handlers
    - From: Manual classList, waited for poll
    - To: Update dataset + updateSingleCardStatus for instant color change

---

## v.0.0.37.00 — Production Release
Date: 2026-01-26
Type: Production

### Release Summary
- Upload modal: Upload PDF (red), Open Student Folder, Write Lesson History, Lesson Note, Lesson History
- Open Student Folder with page-level spinner
- Lesson Notes → Lesson Note
- Button colors: red/orange/blue/green/grey
- Loading overlay above modals

---

## v.0.0.36.06 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Upload PDF button: purple → red (matches status colors)

### Changes (detailed)

#### Changed
- Index.html
  - .upload-btn-pdf
    - From: #7c3aed / #6d28d9 (purple)
    - To: #D32F2F / #B71C1C (red, matches .event-block.uploaded)

---

## v.0.0.36.05 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Loading spinner above modals

### Changes (detailed)

#### Fixed
- Index.html
  - #loading
    - From: z-index 1000 (behind modal)
    - To: z-index 100000 (above modals)

---

## v.0.0.36.04 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Page-level spinner for Open Student Folder while fetching

### Changes (detailed)

#### Changed
- Index.html
  - openStudentFolder()
    - From: Button spinner
    - To: Page-level showLoading/hideLoading overlay

---

## v.0.0.36.03 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Restored Upload PDF button; Write Lesson History full-width

### Changes (detailed)

#### Changed
- Index.html
  - (upload modal)
    - From: Primary action toggled between Upload PDF / Write Lesson History
    - To: Upload PDF (compact, top left) and Write Lesson History (full-width) both always visible

---

## v.0.0.36.02 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Upload modal layout: compact top row with Open Student Folder
- New Open Student Folder button, Lesson Note rename, distinct button colors

### Changes (detailed)

#### Added
- Code.js
  - getStudentFolderUrl(folderName)
    - Added: Returns Drive folder URL by name; null for demo lessons
- Index.html
  - openStudentFolder(), Open Student Folder button
    - Added: Opens student folder in new tab

#### Changed
- Index.html
  - (upload modal)
    - From: Four full-width stacked buttons
    - To: Top row (primary action left, Open Student Folder right), Upload PDF compact, Lesson Note (was Lesson Notes)
  - (button colors)
    - From: All primary actions green
    - To: Upload PDF purple, Write Lesson History orange, Lesson Note blue, Lesson History green

---

## v.0.0.36.01 — Development
Date: 2026-01-26
Type: Dev Change

### Summary
- Renamed badge and button labels for clarity

### Changes (detailed)

#### Changed
- Index.html
  - (evaluation badges)
    - From: "Evaluation Due", "Evaluation Ready"
    - To: "Write Evaluation", "Give Evaluation"
  - (upload modal button)
    - From: "Upload Lesson History"
    - To: "Write Lesson History"

---

## v.0.0.36.00 — Production Release
Date: 2026-01-26
Type: Production

### Release Summary
- Current production version

---

## v.0.0.29.00 — Production Release
Date: 2024-12-19
Type: Production

### Release Summary
- Updated tooltip text for clarity
- Deployed as new app version v0.0.29

---

## v.0.0.28.02 — Development
Date: 2024-12-19
Type: Dev Change

### Summary
- Increased calendar date font size for better visibility

### Changes (detailed)

#### Changed
- Index.html
  - (calendar date styling)
    - From: 3rem font size
    - To: 3.125rem (+2px) for better visibility

---

## v.0.0.28.01 — Development
Date: 2024-12-19
Type: Dev Change

### Summary
- Demo lesson folder creation system
- Interactive tooltip system (FeatureNudge)
- Database state preservation for converted demo lessons

### Changes (detailed)

#### Added
- Index.html
  - FeatureNudge, Create Folder Modal, Confirmation Modal
    - Added: Demo lesson folder creation system, interactive tooltip system
- Code.js
  - fetchAndCacheTodayLessons(), createDemoLessonFolderWithDetails()
    - Added: Database state preservation, student name integration, template integration
- Helper.js
  - (student/folder utilities)
    - Added: Student List integration, lesson type detection with ID prefixes

#### Changed
- Code.js
  - fetchAndCacheTodayLessons()
    - From: Overwrote converted demo lesson folder names
    - To: Preserves folderName for converted demo lessons
  - getLessonsTodayStatuses()
    - From: Returned eventID, pdfUpload, lessonHistory only
    - To: Includes folderName in returned statuses
  - createDemoLessonFolderWithDetails()
    - From: Basic folder creation
    - To: Student name integration in file/folder naming (possessive format)
- Index.html
  - (tooltip behavior)
    - From: Auto-hide timer
    - To: Removed auto-hide; shows every refresh

#### Fixed
- Index.html
  - (event property)
    - From: event.studentName
    - To: event.studentNames
- Code.js
  - (converted demo lessons)
    - From: Database overwrite for converted demo lessons
    - To: Preserves folderName and status
- (file/folder naming)
  - From: Inconsistent possessive format
  - To: "Student's Lesson Note", "Student's Lesson Notes"

---

## v.0.0.28.00 — Production Release
Date: 2024-12-19
Type: Production

### Release Summary
- Enhanced success modal with smart state management
- Real-time UI updates without page refresh
- System font and Lucide icon integration

### Changes (detailed)

#### Added
- Index.html
  - (success modal, modals, UI)
    - Added: Database state checking, duplicate prevention, loading states, real-time UI updates, local storage management, modal state management
- Index.html
  - (styling)
    - Added: System font integration, Lucide icon library integration

#### Fixed
- Index.html
  - (success modal)
    - From: Incorrect button colors and icons
    - To: Correct styling
  - (modals)
    - From: Styling conflicts
    - To: Resolved conflicts
  - (fonts)
    - From: Font loading issues
    - To: Fixed loading
  - (errors)
    - From: Poor error feedback
    - To: Improved error handling and user feedback

---

**Versioning System (v.0.0.YY.ZZ):**
- **WW** = App number (do not change unless new app)
- **XX** = Version line (do not change unless major version bump)
- **YY** = Production version (increment on publish/release)
- **ZZ** = Development iteration (increment on every code change)
