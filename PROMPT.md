# New Teachers App - Cursor Setup Prompt

## Project Context

This is a Google Apps Script web application for managing daily lessons, student records, and lesson documentation for a language school in Japan.

## Versioning System

**Dual Versioning System:**
- **App Version** (v0.0.28): Increments when deployed to Google Apps Script
- **Development Version** (v0.0.28.01, v0.0.28.02, etc.): Increments with each code change

**Current Version:** v0.0.29.00

## File Structure

- `Code.js` - Main Google Apps Script logic
- `Helper.js` - Utility functions
- `Index.html` - User interface and client-side JavaScript
- `README.md` - Comprehensive documentation
- `CHANGELOG.md` - Version history and changes
- `PROMPT.md` - This file (setup instructions)

## Key Features

### Demo Lesson System
- Automatic folder creation from demo lessons
- Student name integration in possessive format
- Template copying for lesson notes and history
- Database state preservation

### Interactive Tooltip
- FeatureNudge tooltip component
- Shows on first demo lesson of the day
- No localStorage persistence (shows every refresh)
- Interactive buttons for folder creation

### Database Management
- Smart preservation of converted demo lessons
- Event fetching enhancement
- Cancelled event handling

## Development Workflow

### When Making Changes:
1. **Increment development version** (e.g., v0.0.28.01 → v0.0.28.02)
2. **Update CHANGELOG.md** with new entry
3. **Document changes** in Added/Fixed/Changed categories
4. **Test functionality** before marking complete

### Changelog Format:
```markdown
## [v0.0.28.02] - 2024-12-19

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Modified functionality description
```

## Important Code Patterns

### Property Names
- Use `event.studentNames` (plural), not `event.studentName` (singular)

### File Naming
- Use possessive format: "Student's Lesson Note", "Student's Lesson History"
- Include student names in all files and folders

### Database Preservation
- Converted demo lessons should be preserved across page refreshes
- Use `oldStatus.folderName` to check if lesson was converted

### Tooltip Behavior
- Shows every time page is refreshed
- No auto-hide timer
- Interactive buttons for user actions

## Key Functions

### Core Functions (Code.js)
- `createDemoLessonFolderWithDetails()` - Creates student folders
- `fetchAndCacheTodayLessons()` - Fetches events with preservation
- `getLessonsTodayStatuses()` - Gets statuses with folderName
- `updateDemoLessonToRegular()` - Converts demo to regular lessons

### Client Functions (Index.html)
- `showDemoLessonTooltip()` - Shows interactive tooltip
- `openCreateFolderModal()` - Opens folder creation modal
- `refreshCalendarData()` - Refreshes without page reload

## Testing Checklist

Before marking changes complete:
- [ ] Demo lesson folder creation works
- [ ] Tooltip appears on first demo lesson
- [ ] Converted lessons stay converted after refresh
- [ ] File names include student names
- [ ] Database preservation works correctly
- [ ] No console errors
- [ ] UI updates properly

## Common Issues

### Database Overwrite
- Check `fetchAndCacheTodayLessons()` preservation logic
- Ensure `oldStatus.folderName` is being used

### Property Name Errors
- Verify `event.studentNames` (not `event.studentName`)
- Check console for undefined property errors

### Tooltip Issues
- Ensure no localStorage persistence
- Check positioning and visibility
- Verify interactive buttons work

## Deployment Notes

- Deploy as web app in Google Apps Script
- Set access to "Anyone, even anonymous"
- Execute as "User accessing the web app"
- Test deployed version thoroughly

---

**Use this prompt to quickly set up the same development environment and workflow on any Cursor instance.**
