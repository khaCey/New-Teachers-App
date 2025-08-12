# Changelog

All notable changes to the New Teachers App will be documented in this file.

## [v0.0.29.00] - 2024-12-19

### Changed
- Updated tooltip text from "create new students" to "create new student folders" for clarity
- Deployed as new app version v0.0.29

## [v0.0.28.02] - 2024-12-19

### Changed
- Increased calendar date font size from 3rem to 3.125rem (+2px) for better visibility

## [v0.0.28.01] - 2024-12-19

### Added
- Demo lesson folder creation system
- Interactive tooltip system (FeatureNudge)
- Create Folder Modal and Confirmation Modal
- Database state preservation for converted demo lessons
- Student name integration in file/folder naming (possessive format)
- Template integration for lesson notes and history
- Student List integration for new students
- Lesson type detection with proper ID prefixes
- Loading overlays and real-time validation
- Non-destructive calendar refresh

### Fixed
- Property name issue: `event.studentName` → `event.studentNames`
- Database overwrite issue for converted demo lessons
- Tooltip persistence (shows every refresh, no localStorage)
- File naming format (possessive: "Student's Lesson Note")
- Folder naming format (possessive: "Student's Lesson Notes")

### Changed
- Updated `fetchAndCacheTodayLessons()` to preserve converted demo lessons
- Updated `getLessonsTodayStatuses()` to include folderName
- Enhanced `createDemoLessonFolderWithDetails()` with student name integration
- Modified tooltip behavior (removed auto-hide timer)

## [v0.0.28.00] - 2024-12-19

### Added
- Enhanced success modal with smart state management
- Database state checking before operations
- Duplicate prevention for lesson history
- Loading states with button spinners
- Real-time UI updates without page refresh
- Local storage management for status caching
- Database synchronization between client and server
- Modal state management and cleanup
- System font integration
- Lucide icon library integration

### Fixed
- Success modal button colors and icons
- Modal styling conflicts
- Font loading issues
- Error handling and user feedback

---

**Versioning System:**
- **App Version** (v0.0.28): Increments when deployed to Google Apps Script
- **Development Version** (v0.0.28.01, v0.0.28.02, etc.): Increments with each code change

**Note**: This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format.
