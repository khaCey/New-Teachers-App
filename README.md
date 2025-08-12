# New Teachers App

A Google Apps Script web application for managing daily lessons, student records, and lesson documentation for a language school in Japan.

## Overview

This application provides a comprehensive dashboard for teachers to:
- View today's lessons in a calendar-style interface
- Upload lesson notes as PDFs to student folders
- Record lesson history and progress
- Manage demo lessons and create student folders
- Track lesson completion status

## Features

### 📅 Daily Lesson Dashboard
- **Visual Calendar Interface**: Displays today's lessons in a time-based grid (10:00-20:00)
- **Real-time Status Tracking**: Color-coded lesson blocks showing completion status
- **Current Time Indicator**: Red line showing current time on the calendar
- **Auto-refresh**: Status updates every minute

### 📚 Lesson Management
- **PDF Upload**: Convert and upload lesson notes to student folders
- **Direct File Access**: One-click access to student lesson notes and history files
  - Google Docs integration for lesson notes
  - Google Sheets integration for lesson history
- **Enhanced Success Modal**: 
  - **Smart State Management**: Checks database state before marking lesson history
  - **Duplicate Prevention**: Prevents marking lesson history multiple times
  - **Loading States**: Visual feedback with button spinners during operations
  - **Real-time UI Updates**: Immediate card status updates without page refresh
  - **Error Handling**: Comprehensive error handling with user feedback
- **Student Evaluations**: Comprehensive evaluation system with:
  - **Evaluation Tags**: `#evaluationReady` and `#evaluationDue` in calendar events
  - **Automatic Color Coding**: Green for ready, red for due evaluations
  - **Evaluation Modal**: Complete evaluation form with scores and feedback
  - **PDF Generation**: Automatic creation of evaluation documents
- **Lesson History**: Record detailed lesson progress including:
  - Teacher name
  - Warm-up topics
  - Unit/pages covered
  - Homework assignments
  - Comments and student requests
  - Advice for future lessons

### 👥 Student Management
- **Student Folders**: Organized Google Drive structure for each student
- **Demo Lesson Support**: Special handling for demo lessons with automatic folder creation
- **Direct File Access**: One-click buttons to open student files
  - **Lesson Notes**: Direct link to Google Docs templates
  - **Lesson History**: Direct link to Google Sheets progress tracking
- **Smart Student Name Extraction**: Automatic parsing of student names from folder structures

### 🎯 Status Tracking
- **Visual Indicators**: 
  - 🔴 Red: Lesson overdue (no PDF uploaded) or evaluation due
  - 🟡 Yellow: PDF uploaded, history pending
  - 🟢 Green: Complete (PDF + history recorded) or evaluation ready
  - 🟠 Orange: Evaluation button for events with `#evaluationDue` tag
- **Real-time Status Updates**: Automatic polling every 60 seconds
- **Local Storage Caching**: Persistent status data for offline viewing

### 🎨 User Interface Enhancements
- **Modern Modal Design**: 
  - **Upload Modal**: Clean, modern interface with system font stack
  - **Success Modal**: Professional design with file name display
  - **Edit Lesson Modal**: Enhanced layout with icon integration
- **System Font Integration**: Uses native system fonts (SF Pro Display, Segoe UI, Ubuntu)
- **Lucide Icon Library**: Modern, consistent iconography throughout the interface
- **Responsive Design**: Optimized for various screen sizes and devices
- **Loading States**: Button-specific spinners for better user feedback
- **Click-outside-to-close**: Enhanced modal interaction patterns

## Technical Architecture

### Google Apps Script Components

#### `Code.js` - Main Application Logic
- **Calendar Integration**: Fetches events from two Google Calendars
  - Main lessons calendar
  - Demo lessons calendar
- **Spreadsheet Management**: Reads/writes to Google Sheets for lesson tracking
- **Event Processing**: Filters and processes calendar events for lesson display
- **Folder Creation**: Automatically creates student folders for new students

#### `Helper.js` - Utility Functions
- **PDF Generation**: Converts Google Docs to PDF and uploads to student folders
- **Lesson History**: Appends lesson data to student history spreadsheets
- **Student Data**: Manages student folder structures and teacher lists
- **Status Updates**: Tracks PDF upload and lesson history completion

#### `Index.html` - User Interface
- **Modern Web Interface**: Responsive design with Google Material Design principles
- **Interactive Calendar**: Click-to-edit lesson blocks with modal dialogs
- **Real-time Updates**: JavaScript polling for status changes
- **Form Validation**: Client-side validation for all user inputs
- **Google Integration**: Direct links to Google Docs and Sheets with branded styling
- **Enhanced Error Handling**: Comprehensive logging and user feedback
- **Local Storage Management**: Persistent status caching and state management
- **Database State Synchronization**: Real-time sync between UI, localStorage, and server
- **Modal State Management**: Advanced modal handling with proper cleanup

### Data Sources

#### Google Sheets
- **Student List**: Contains student names and folder mappings
- **Lessons Today**: Tracks current day's lessons with status flags
- **Lesson History**: Individual spreadsheets for each student's progress

#### Google Drive
- **Student Folders**: Organized folder structure per student
- **Lesson Notes**: Google Docs templates converted to PDFs
- **History Files**: Spreadsheets tracking long-term student progress

#### Google Calendar
- **Main Calendar**: Regular lesson events
- **Demo Calendar**: Demo lesson events with special handling

## Setup and Configuration

### Prerequisites
- Google Apps Script project
- Google Sheets with student data
- Google Drive with organized folder structure
- Google Calendar with lesson events

### Configuration Files

#### `appsscript.json`
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Sheets",
        "version": "v4",
        "serviceId": "sheets"
      },
      {
        "userSymbol": "Drive",
        "version": "v3",
        "serviceId": "drive"
      }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

### Required Google Sheets Structure

#### Student List Sheet
| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Teacher  | ...      | Name     | Folder   |

#### Lessons Today Sheet
| eventID | eventName | Start | End | studentName | folderName | pdfUpload | lessonHistory |
|---------|-----------|-------|-----|-------------|------------|-----------|---------------|

## Usage

### For Teachers

1. **Access the Dashboard**: Open the deployed web app URL
2. **View Today's Lessons**: See all lessons in a visual calendar format
3. **Upload Lesson Notes**: Click on a lesson block to upload PDF notes
4. **Access Student Files**: Use one-click buttons to open lesson notes and history
5. **Record Lesson History**: Add detailed lesson progress after uploading notes
6. **Track Completion**: Monitor lesson status through color-coded indicators

### For Administrators

1. **Manage Student Data**: Update the Student List sheet with new students
2. **Configure Calendars**: Ensure lesson events are properly formatted
3. **Monitor Usage**: Check lesson completion rates and teacher activity

## Key Functions

### Core Functions (`Code.js`)
- `doGet()`: Web app entry point
- `getEventsJson()`: Returns lesson data for the dashboard
- `fetchAndCacheTodayLessons()`: Fetches and processes today's lessons with demo lesson preservation
- `markPdfUploaded()`: Updates PDF upload status
- `markLessonHistory()`: Updates lesson history status with database synchronization
- `getLessonsTodayStatuses()`: Retrieves current lesson statuses from database
- `createFoldersForStudents()`: Creates student folder structure
- `changeEventColor()`: Updates calendar event colors based on evaluation tags
- `createDemoLessonFolderWithDetails()`: Creates complete student folder structure from demo lessons
- `getNextStudentNumber()`: Retrieves next available student ID for lesson types
- `addStudentToStudentList()`: Adds new students to the Student List sheet
- `updateDemoLessonToRegular()`: Converts demo lessons to regular lessons in database
- `incrementLessonTypeID()`: Increments student ID counters after folder creation

### Helper Functions (`Helper.js`)
- `uploadStudentPDF()`: Converts and uploads lesson notes
- `addLessonHistoryEntry()`: Records lesson progress
- `getStudentFolders()`: Retrieves student folder list
- `getTeacherList()`: Gets available teachers
- `getStudentLinks()`: Returns direct URLs to student files
- `generateEvaluationPDF()`: Creates evaluation PDF documents
- `createEvaluationContent()`: Formats evaluation data for PDF generation

### Client-Side Functions (`Index.html`)
- `closeSuccessModal()`: Enhanced modal closing with database state checking and UI updates
- `showSuccessPage()`: Displays success modal with file name extraction and button management
- `uploadPDF()`: Handles PDF upload with loading states and error handling
- `setButtonLoading()`: Manages button loading states with spinners
- `updateSingleCardStatus()`: Updates individual card appearance based on status changes
- `closeAllModals()`: Comprehensive modal cleanup and state reset
- `openLessonNotes()`: Direct access to student lesson notes
- `openLessonHistory()`: Direct access to student lesson history
- `openCreateFolderModal()`: Opens demo lesson folder creation modal
- `showDemoLessonTooltip()`: Displays interactive tooltip for demo lesson discovery
- `refreshCalendarData()`: Refreshes calendar data without page reload
- `handleConfirmCreate()`: Processes folder creation with validation and loading states
- `parseStudentInfo()`: Extracts and validates student information from events
- `populateExtraStudentFields()`: Manages dynamic student fields for group lessons

## Calendar Event Format

### Regular Lessons
- **Title Format**: `Student Name (Subject)`
- **Multiple Students**: `Student1 and Student2 (Subject)`
- **Color Coding**: Valid lessons exclude graphite, lavender, and banana colors

### Demo Lessons
- **Title Format**: `Student Name D/L (Subject)`
- **Special Handling**: Automatic folder creation for new demo students
- **Folder Naming**: `Student Name DEMO`

### Evaluation Lessons
- **Evaluation Ready**: Add `#evaluationReady` to event description
- **Evaluation Due**: Add `#evaluationDue` to event description
- **Automatic Color Coding**: Green for ready, red for due
- **Evaluation Button**: Orange button appears on events with `#evaluationDue` tag

## Folder Structure

```
Google Drive/
├── Student Name/
│   ├── Student Name's Lesson Notes/
│   │   ├── 001 Student Name's Lesson Note 01012024.pdf
│   │   ├── 002 Student Name's Lesson Note 02012024.pdf
│   │   └── ...
│   ├── Student Name's Evaluation/
│   │   ├── Student Name Evaluation 01012024.pdf
│   │   └── ...
│   ├── Student Name's Lesson Note (template)
│   └── Student Name's Lesson History (spreadsheet)
└── ...
```

## Development Notes

### Timezone Handling
- Application uses Asia/Tokyo timezone
- All date/time operations respect the configured timezone
- Calendar events are processed in the local timezone

### Error Handling
- Comprehensive error logging with Stackdriver
- Enhanced client-side logging with prefixed messages (`[LessonNotes]`, `[LessonHistory]`)
- Graceful fallbacks for missing data
- User-friendly error messages in the interface
- Database state validation before operations
- Real-time error feedback with loading states

### State Management
- **Local Storage Integration**: Persistent caching of lesson statuses
- **Database Synchronization**: Real-time sync between client and server states
- **UI State Consistency**: Immediate visual updates without page refresh
- **Modal State Cleanup**: Proper cleanup of modal states and loading indicators
- **Duplicate Operation Prevention**: Smart checking to prevent redundant database calls

### Performance Considerations
- Efficient polling (60-second intervals)
- Minimal data transfer between client and server
- Cached status updates to reduce API calls

### Google Integration
- Direct links to Google Docs and Sheets using official Google colors
- Seamless integration with Google Workspace ecosystem
- Automatic student name extraction from folder structures
- Automatic calendar event color management based on evaluation tags

## Deployment

1. **Deploy as Web App**: In Google Apps Script editor
2. **Set Access**: Configure as "Anyone, even anonymous"
3. **Execute As**: Set to "User accessing the web app"
4. **Share URL**: Distribute the generated web app URL to teachers

## Maintenance

### Regular Tasks
- Monitor calendar event formatting
- Update student list as needed
- Review lesson completion rates
- Backup important data periodically

### Troubleshooting
- Check Google Apps Script logs for errors
- Verify calendar permissions and event formatting
- Ensure student folder structure is maintained
- Monitor Google Drive storage usage
- Check browser console for client-side error messages
- Verify Google Docs and Sheets permissions for direct links

## Security Considerations

- Web app access is configured for anonymous users
- All data is stored in Google's secure infrastructure
- No external API keys or sensitive data in code
- User authentication handled by Google's systems

---

**Version**: v0.0.28  
**Last Updated**: 2024  
**Timezone**: Asia/Tokyo  
**Language**: English/Japanese (mixed content)  
**Clasp Project ID**: 1GgbhvcVRx27p3fCbah5wduyzczrzbzaurgK15oeYdn5bjh8XxOpDCRSm

## Recent Updates (v0.0.28)

### Demo Lesson Folder Creation System
- **Smart Folder Creation**: Automatic creation of student folders from demo lessons
- **Student Name Integration**: Files and folders include student names in possessive format
  - **Files**: "Khacey Salvador's Lesson Note", "Khacey Salvador's Lesson History"
  - **Folders**: "Khacey Salvador's Lesson Notes", "Khacey Salvador's Evaluation"
- **Template Integration**: Automatic copying of lesson note and history templates
- **Student List Integration**: Automatic addition of new students to the Student List sheet
- **Lesson Type Detection**: Smart detection of lesson types (Regular, Kids, Group) with proper ID prefixes
- **Database Preservation**: Converted demo lessons are preserved and don't revert on page refresh

### Interactive Tooltip System
- **FeatureNudge Tooltip**: Modern, non-intrusive tooltip component
- **Demo Lesson Discovery**: Tooltip appears on the first demo lesson of the day
- **Persistent Display**: Shows every time the page is refreshed (no localStorage persistence)
- **Interactive Actions**: 
  - "Try it now" button directly opens the folder creation modal
  - "Dismiss" button closes the tooltip
- **Smart Positioning**: Automatically positions to avoid going off-screen
- **Responsive Design**: Adjusts position on window resize/scroll

### Enhanced Modal System
- **Create Folder Modal**: Professional interface for demo lesson folder creation
  - **Student Name Display**: Shows the student name from the demo lesson
  - **Create Folder Button**: Initiates the folder creation process
- **Confirmation Modal**: Detailed confirmation interface with:
  - **Lesson Type Selection**: Regular, Kids, Kids [Group], Group options
  - **Student Number Assignment**: Automatic assignment of next available student ID
  - **Student Name Confirmation**: Editable student name field
  - **Group Lesson Support**: Dynamic fields for multiple students
  - **Folder Name Preview**: Real-time preview of the generated folder name
  - **Validation System**: Comprehensive validation with user feedback
  - **Loading States**: Visual feedback during data loading and folder creation

### Database State Management
- **Demo Lesson Conversion**: Seamless conversion from demo to regular lessons
- **Status Preservation**: Converted lessons maintain their status across page refreshes
- **Event Fetching Enhancement**: Smart preservation of converted demo lessons during event fetching
- **Cancelled Event Handling**: Proper removal of cancelled events from the database

### File and Folder Naming Convention
- **Consistent Format**: All files and folders use possessive format with student names
- **Google Drive Integration**: Proper naming for Google Docs and Sheets
- **Template Management**: Automatic template copying with student-specific naming
- **Student ID Integration**: Proper student ID assignment with lesson type prefixes (0, K, M)

### Technical Improvements
- **Property Name Fixes**: Corrected `event.studentNames` property usage
- **Error Prevention**: Comprehensive error handling for folder creation process
- **Loading Overlays**: Prevents user interaction during data loading
- **Real-time Validation**: Instant feedback on form inputs and validation
- **Calendar Refresh**: Non-destructive calendar refresh that preserves user progress

## Recent Updates (v0.0.27)

### Enhanced Success Modal
- **Smart State Management**: Database state checking before operations
- **Duplicate Prevention**: Prevents marking lesson history multiple times
- **Loading States**: Visual feedback during database operations
- **Real-time UI Updates**: Immediate card status changes

### UI/UX Improvements
- **Modern Modal Design**: Clean, professional interface
- **System Font Integration**: Native system fonts for better performance
- **Lucide Icon Library**: Consistent, modern iconography
- **Enhanced Error Handling**: Better user feedback and error recovery

### Technical Enhancements
- **Local Storage Management**: Persistent status caching
- **Database Synchronization**: Real-time state sync
- **Modal State Management**: Improved modal handling
- **Performance Optimization**: Reduced API calls and better caching 