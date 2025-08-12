const SS_ID = "1IobCrDaNAPquEX0WKR8fLyh0p-Q9XutIdHHuu_3XXEg";
const STUDENTLIST = SpreadsheetApp.openById(SS_ID);
const CALENDAR_ID = 'greensquare.jp_h8u0oufn8feana384v67o46o78@group.calendar.google.com';
const DEMO_CALENDAR_ID = 'greensquare.jp_1m1bhvfu9mtts7gq9s9jsj9kbk@group.calendar.google.com';

/** Web app entry point */
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle("Today's Lessons");
}

/**
 * Returns every row of your EventCache sheet,
 * converting Date objects in the "Start" and "End"
 * columns into "HH:mm" strings in your script's timezone.
 */
function getEventsJson() {
  const SHEET_NAME     = 'lessons_today';
  const tz             = Session.getScriptTimeZone();
  // Open and read the sheet
  
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return '[]';         // no rows → empty array

  const headers = data.shift();              // remove header row
  const rows = data.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let v = row[i];
      // If this column is Start or End and v is a Date, format as "HH:mm"
      if ((h === 'Start' || h === 'End') && v instanceof Date) {
        v = Utilities.formatDate(v, tz, 'HH:mm');
      }
      obj[h] = v;
    });
    return obj;
  });

  Logger.log(`getEventsJson() → ${rows.length} rows`);
  return JSON.stringify(rows);
}

/**
 * Returns an array of { eventID, pdfUpload, lessonHistory, folderName } 
 * for every row in the `lessons_today` sheet.
 */
function getLessonsTodayStatuses() {
  const SHEET_NAME = 'lessons_today';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found.`);
  
  // Read all data
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];  // no data
  
  // First row = headers
  const headers = data.shift().map(h => h.toString().trim());
  const idxID   = headers.indexOf('eventID');
  const idxPDF  = headers.indexOf('pdfUpload');
  const idxLH   = headers.indexOf('lessonHistory');
  const idxFolder = headers.indexOf('folderName');
  if (idxID < 0 || idxPDF < 0 || idxLH < 0) {
    throw new Error('Missing one of eventID, pdfUpload or lessonHistory headers.');
  }
  
  // Build and return status objects
  return data.map(row => {
    // normalise any case or boolean
    const pdf = String(row[idxPDF]).toLowerCase() === 'true';
    const lh  = String(row[idxLH]).toLowerCase()  === 'true';
    return {
      eventID:       String(row[idxID]),
      pdfUpload:     pdf,
      lessonHistory: lh,
      folderName:    idxFolder >= 0 ? String(row[idxFolder] || '') : ''
    };
  });
}

/**
 * Marks the given event row in `lessons_today` as having had its PDF uploaded.
 */
function markPdfUploaded(eventID, flag) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const sht  = ss.getSheetByName('lessons_today');
  const data = sht.getDataRange().getValues();
  const hdrs = data.shift();

  // find the row matching eventID
  for (let r = 0; r < data.length; r++) {
    if (data[r][ hdrs.indexOf('eventID') ] === eventID) {
      sht.getRange(r+2, hdrs.indexOf('pdfUpload')+1)
         .setValue(flag ? 'TRUE' : 'FALSE');
      return { success: true };
    }
  }
  throw new Error("EventID not found in lessons_today: " + eventID);
}

/**
 * Marks the given event row in `lessons_today` as having had its lesson history recorded.
 */
function markLessonHistory(eventID, flag) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const sht  = ss.getSheetByName('lessons_today');
  const data = sht.getDataRange().getValues();
  const hdrs = data.shift();

  // find the row matching eventID
  for (let r = 0; r < data.length; r++) {
    if (data[r][ hdrs.indexOf('eventID') ] === eventID) {
      sht.getRange(r+2, hdrs.indexOf('lessonHistory')+1)
         .setValue(flag ? 'TRUE' : 'FALSE');
      return { success: true };
    }
  }
  throw new Error("EventID not found in lessons_today: " + eventID);
}

/**
 * Checks if a lesson event is valid based on its color
 * @param {CalendarEvent} event - Calendar event object
 * @returns {boolean} True if event is a valid lesson
 */
function isValidLessonEvent_(event) {
  // Get the event color
  var color = event.getColor();
  
  // Check if the color indicates a cancelled/rescheduled lesson
  // Graphite (8), Lavender (9), and Banana (5) indicate cancelled/rescheduled events
  if (color === '8' || color === '9' || color === '5') {
    return false;
  }
  return true;
}

/**
 * Fetches all lesson & demo events for today (or a specific date) from the two specified calendars,
 * preserves any existing pdfUpload and lessonHistory flags, and writes the combined results into 'lessons_today'.
 *
 * Task List:
 * 1. Read existing pdfUpload & lessonHistory statuses from the current 'lessons_today' sheet.
 * 2. Determine the target date (today or dateOverride).
 * 3. Fetch events for that date from both CALENDAR_ID and DEMO_CALENDAR_ID.
 * 4. Build a flat list of student occurrences (one per student per event).
 * 5. Group the flat list by eventID, accumulating multiple studentNames.
 * 6. Merge old statuses (pdfUpload, lessonHistory) back into each grouped lesson.
 * 7. Clear and overwrite the 'lessons_today' sheet with the merged data.
 *
 * @param {string=} dateOverride Optional "DD/MM/YYYY" string to fetch for a specific day.
 * @returns {Array<Object>}      Array of grouped lesson objects written to sheet.
 */
function fetchAndCacheTodayLessons(dateOverride) {
  Logger.log('--- fetchAndCacheTodayLessons START ---');
  Logger.log('dateOverride value: %s, type: %s', dateOverride, typeof dateOverride);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();

  // 1) Read existing statuses (pdfUpload & lessonHistory) from 'lessons_today' sheet
  const oldStatusMap = {};
  try {
    const existingStatuses = getLessonsTodayStatuses();
    existingStatuses.forEach(status => {
      oldStatusMap[status.eventID] = {
        pdfUpload: status.pdfUpload,
        lessonHistory: status.lessonHistory,
        folderName: status.folderName // Preserve folderName
      };
    });
    Logger.log('Loaded %s existing statuses', existingStatuses.length);
  } catch (err) {
    Logger.log('No existing statuses or error: %s', err);
  }

  // 2) Determine target date (today or dateOverride)
  let targetDate;
  if (typeof dateOverride === 'string' && dateOverride.includes('/')) {
    Logger.log('Parsing dateOverride as string in DD/MM/YYYY format');
    const parts = dateOverride.split('/').map(Number);
    const d = parts[0], m = parts[1], y = parts[2];
    targetDate = new Date(y, m - 1, d);
  } else if (dateOverride instanceof Date) {
    Logger.log('Using dateOverride as Date object');
    targetDate = new Date(dateOverride);
  } else {
    Logger.log('No valid dateOverride, using today');
    targetDate = new Date();
  }
  targetDate.setHours(0, 0, 0, 0);
  Logger.log('Target date: %s', targetDate);

  // 3) Fetch events for that date from both calendars
  const calMain = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calMain) throw new Error('Calendar not found: ' + CALENDAR_ID);
  const calDemo = CalendarApp.getCalendarById(DEMO_CALENDAR_ID);
  if (!calDemo) throw new Error('Calendar not found: ' + DEMO_CALENDAR_ID);

  const startTime = new Date(targetDate);
  const endTime = new Date(targetDate);
  endTime.setDate(endTime.getDate() + 1);
  Logger.log('Fetching events from %s to %s', startTime, endTime);

  const eventsMain = calMain.getEvents(startTime, endTime);
  const eventsDemo = calDemo.getEvents(startTime, endTime);
  Logger.log('Fetched %s main events, %s demo events', eventsMain.length, eventsDemo.length);
  const allEvents = eventsMain.concat(eventsDemo);

  // 4) Build flat array: one entry per student occurrence
  const studentSheet = STUDENTLIST.getSheetByName('Student List');
  if (!studentSheet) throw new Error('Student List sheet not found');
  const studentData = studentSheet.getDataRange().getValues();
  Logger.log('Loaded %s students from Student List', studentData.length - 1);
  const studentMap = {};
  for (let i = 1; i < studentData.length; i++) {
    const name = studentData[i][2];
    const folder = studentData[i][3];
    if (name && folder) studentMap[name] = folder;
  }

  const flat = [];
  allEvents.forEach(event => {
    const title = event.getTitle();
    if (/break/i.test(title) || /teacher/i.test(title)) return;
    if (!isValidLessonEvent_(event)) return;

    const rawStart = event.getStartTime();
    const rawEnd = event.getEndTime();
    const namePart = title.split('(')[0].replace(/子/g, '');
    const names = namePart.split(/\s+and\s+/i).map(n => n.trim()).filter(Boolean);

    // Clean D/L markers from names BEFORE processing shared last names
    const cleanNames = names.map(nm => {
      return nm.replace(/\s*D\/L\s*/i, '').trim();
    });

    // Check for evaluation tags in description
    const description = event.getDescription() || '';
    const hasEvaluationReady = description.includes('#evaluationReady');
    const hasEvaluationDue = description.includes('#evaluationDue');
    const teacherMatch = description.match(/#teacher(\w+)/i);
    const teacher = teacherMatch ? teacherMatch[1] : '';
    
    // Change event color based on evaluation tags
    if (hasEvaluationReady) {
      changeEventColor(event.getId(), 'green');
    } else if (hasEvaluationDue) {
      changeEventColor(event.getId(), 'red');
    }

    // Improved last name detection for students with same last name
    let sharedLastName = '';
    if (cleanNames.length > 1) {
      // Check if first student has only one word (first name only)
      const firstStudentParts = cleanNames[0].split(/\s+/);
      if (firstStudentParts.length === 1) {
        // First student has only first name, look for last name in subsequent students
        for (let i = 1; i < cleanNames.length; i++) {
          const parts = cleanNames[i].split(/\s+/);
          if (parts.length > 1) {
            sharedLastName = parts[parts.length - 1]; // Get last part as last name
            Logger.log('Detected shared last name "%s" for students: %s', sharedLastName, cleanNames.join(', '));
            break;
          }
        }
      } else {
        // First student has full name, use their last name
        const firstStudentParts = cleanNames[0].split(/\s+/);
        sharedLastName = firstStudentParts[firstStudentParts.length - 1];
        Logger.log('Using last name "%s" from first student for shared last name', sharedLastName);
      }
    }

    cleanNames.forEach((nm, index) => {
      const parts = nm.split(/\s+/);
      // If student has only one word and we have a shared last name, combine them
      const fullName = (parts.length === 1 && sharedLastName) ? 
        (parts[0] + ' ' + sharedLastName) : nm;
      
      Logger.log('Student %d: Original="%s", Parts=%s, FullName="%s", SharedLastName="%s"', 
        index + 1, nm, JSON.stringify(parts), fullName, sharedLastName);
      
      // Clean the student name (D/L already removed above)
      let cleanStudentName = fullName.trim();
      
      let folderName = studentMap[ cleanStudentName ] || '';
      if (/D\/L/i.test(title)) {
        // For demo lessons, create a temporary folder name for display
        folderName = cleanStudentName + ' DEMO';
        Logger.log('Demo lesson: event "%s", using temporary folderName "%s" for display', title, folderName);
      }
      // Add isOnline property: true if title contains (Cafe) or (Online)
      const isOnline = /\(\s*(Cafe|Online)\s*\)/i.test(title);
      flat.push({
        eventID:       event.getId(),
        eventName:     title,
        Start:         Utilities.formatDate(rawStart, tz, 'HH:mm'),
        End:           Utilities.formatDate(rawEnd,   tz, 'HH:mm'),
        studentName:   cleanStudentName,
        folderName:    folderName,
        pdfUpload:     false,
        lessonHistory: false,
        evaluationReady: hasEvaluationReady,
        evaluationDue: hasEvaluationDue,
        isOnline:      isOnline,
        teacher:       teacher
      });
    });
  });
  Logger.log('Built flat array of %s lesson occurrences', flat.length);

  // 5) Group by eventID
  const grouped = {};
  flat.forEach(item => {
    if (!grouped[item.eventID]) {
      grouped[item.eventID] = {
        eventID:       item.eventID,
        eventName:     item.eventName,
        Start:         item.Start,
        End:           item.End,
        folderName:    item.folderName,
        studentNames:  [ item.studentName ],
        pdfUpload:     item.pdfUpload,
        lessonHistory: item.lessonHistory,
        evaluationReady: item.evaluationReady,
        evaluationDue: item.evaluationDue,
        teacher:       item.teacher
      };
    } else {
      grouped[item.eventID].studentNames.push(item.studentName);
      // If any student has evaluation tags, mark the event accordingly
      if (item.evaluationReady) grouped[item.eventID].evaluationReady = true;
      if (item.evaluationDue) grouped[item.eventID].evaluationDue = true;
      if (!grouped[item.eventID].teacher && item.teacher) {
        grouped[item.eventID].teacher = item.teacher;
      }
    }
  });
  const lessons = Object.values(grouped);
  Logger.log('Grouped into %s lessons', lessons.length);

  // 6) Merge old statuses and preserve converted demo lessons
  lessons.forEach(lesson => {
    const oldStatus = oldStatusMap[lesson.eventID];
    if (oldStatus) {
      lesson.pdfUpload = oldStatus.pdfUpload;
      lesson.lessonHistory = oldStatus.lessonHistory;
      lesson.folderName = oldStatus.folderName; // Preserve folderName
      
      // Check if this was a demo lesson that has been converted to regular
      // If the old status has a real folder name (not ending in DEMO), preserve it
      if (oldStatus.folderName && !oldStatus.folderName.endsWith('DEMO')) {
        lesson.folderName = oldStatus.folderName;
        Logger.log(`Preserving converted demo lesson: ${lesson.eventID} -> ${lesson.folderName}`);
      }
    }
  });

  // 7) Write into 'lessons_today' sheet
  let tgt = ss.getSheetByName('lessons_today');
  if (!tgt) {
    tgt = ss.insertSheet('lessons_today');
    Logger.log('Created new lessons_today sheet');
  } else {
    tgt.clearContents();
    Logger.log('Cleared lessons_today sheet');
  }

  const headers = [
    'eventID', 'eventName', 'Start', 'End',
    'folderName', 'studentNames', 'pdfUpload', 'lessonHistory',
    'evaluationReady', 'evaluationDue', 'isOnline', 'teacher'
  ];
  tgt.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (lessons.length) {
    const out = lessons.map(l => [
      l.eventID,
      l.eventName,
      l.Start,
      l.End,
      l.folderName,
      l.studentNames.join(', '),
      l.pdfUpload,
      l.lessonHistory,
      l.evaluationReady || false,
      l.evaluationDue || false,
      l.isOnline || false,
      l.teacher || ''
    ]);
    tgt.getRange(2, 1, out.length, headers.length).setValues(out);
    Logger.log('Wrote %s lessons to sheet', out.length);
  } else {
    Logger.log('No lessons to write to sheet');
  }

  Logger.log('--- fetchAndCacheTodayLessons END ---');
  return lessons;
}

// Helper to determine lesson type and prefix from event name
function determineLessonTypeAndPrefix(eventName) {
  if (eventName.includes('子')) {
    return { type: 'Kids', prefix: 'K' };
  }
  if (/\sand\s/i.test(eventName)) {
    return { type: 'Multiple', prefix: 'M' };
  }
  return { type: 'Regular', prefix: '0' };
}

// Helper to increment the lesson type ID in the Code sheet
function incrementLessonTypeID(lessonType) {
  const spreadsheet = STUDENTLIST;
  const codeSheet = spreadsheet.getSheetByName("Code");
  const codeData = codeSheet.getDataRange().getValues();
  for (let i = 1; i < codeData.length; i++) {
    // Unify Kids and Kids [Group] as 'Kids'
    let type = codeData[i][0];
    if (type && (type === 'Kids' || type === 'Kids [Group]')) type = 'Kids';
    if (type && type.toString().trim() === lessonType.toString().trim()) {
      let currentID = parseInt(codeData[i][1], 10);
      if (!isNaN(currentID)) {
        codeSheet.getRange(i + 1, 2).setValue(currentID + 1); // Column B (2)
      }
      break;
    }
  }
}

// Function to create folders and files for students
function createFoldersForStudents(eventName, students) {
    // try {
    //   const studentsFolderId = '11KrhsdqEpjUdMMGsNC67WRiS-gG1TAIV'; // Parent folder ID
    //   const studentsFolder = DriveApp.getFolderById(studentsFolderId);

    //   // Determine lesson type and prefix from event name
    //   let { type: lessonType, prefix } = determineLessonTypeAndPrefix(eventName);
    //   // Unify Kids and Kids [Group] as 'Kids'
    //   if (lessonType === 'Kids' || lessonType === 'Kids [Group]') lessonType = 'Kids';

    //   // Fetch the lesson type ID from the Code sheet
    //   const spreadsheet = STUDENTLIST;
    //   const codeSheet = spreadsheet.getSheetByName("Code");
    //   const codeData = codeSheet.getDataRange().getValues();
    //   let lessonTypeID = '';
    //   for (let i = 1; i < codeData.length; i++) {
    //     let type = codeData[i][0];
    //     if (type && (type === 'Kids' || type === 'Kids [Group]')) type = 'Kids';
    //     if (type && type.toString().trim() === lessonType.toString().trim()) {
    //       lessonTypeID = codeData[i][1];
    //       break;
    //     }
    //   }
    //   if (!lessonTypeID) {
    //     Logger.log(`Lesson type ID not found for: ${lessonType}`);
    //     lessonTypeID = 'UNKNOWN';
    //   }

    //   // Format the student names: commas + "and" at the end, and remove 子 marker if present
    //   const cleanStudents = students.map(s => s.replace(/子/g, '').trim());
    //   const concatenatedNames = formatStudentNames(cleanStudents);
    //   const folderName = `${prefix}${lessonTypeID} ${concatenatedNames}`;

    //   // Check if folder already exists
    //   const existingFolders = studentsFolder.getFoldersByName(folderName);
    //   if (existingFolders.hasNext()) {
    //       Logger.log(`Folder already exists for group: ${folderName}`);
    //       return folderName; // Return existing folder name for consistency
    //   }

    //   // Fetch template IDs from the "Code" sheet
    //   const lessonNoteDocId = codeSheet.getRange("E2").getValue(); // Document template for lesson note
    //   const lessonHistorySheetId = codeSheet.getRange("E4").getValue(); // Sheet template for lesson history

    //   if (!lessonNoteDocId || !lessonHistorySheetId) {
    //       throw new Error("Template file IDs are missing in the 'Code' sheet.");
    //   }

    //   // Comment out folder creation logic for debugging
    //   // const groupFolder = studentsFolder.createFolder(folderName);
    //   // groupFolder.createFolder(`${concatenatedNames}'s Lesson Notes`);
    //   // groupFolder.createFolder(`${concatenatedNames}'s Evaluation`);
    //   // const lessonNoteDocTemplate = DriveApp.getFileById(lessonNoteDocId);
    //   // lessonNoteDocTemplate.makeCopy(`${concatenatedNames}'s Lesson Note`, groupFolder);
    //   // const lessonHistorySheetTemplate = DriveApp.getFileById(lessonHistorySheetId);
    //   // const copiedLessonHistorySheet = lessonHistorySheetTemplate.makeCopy(`${concatenatedNames}'s Lesson History`, groupFolder);
    //   // const copiedSheet = SpreadsheetApp.openById(copiedLessonHistorySheet.getId());
    //   // const firstSheet = copiedSheet.getSheets()[0];
    //   // firstSheet.getRange("A1").setValue(`${concatenatedNames}'s`);
    //   Logger.log(`[DEBUG] Would create folder: ${folderName}`);

    //   Logger.log(`Folders, files, and sheet content updated for group: ${folderName}`);

    //   // Increment the lesson type ID after successful folder creation
    //   incrementLessonTypeID(lessonType);

    //   // Refresh lessons_today data after folder creation
    //   fetchAndCacheTodayLessons();

    //   return folderName;
    // } catch (error) {
    //   Logger.log(`Error creating folder for group: ${eventName}. Error: ${error.message}`);
    //   throw error;
    // }
}

function manual() {
  fetchAndCacheTodayLessons('12/08/2025');
}

/**
 * Creates a folder for a demo lesson
 * @param {string} eventID - The ID of the demo lesson event
 * @param {string} eventName - The name of the demo lesson
 * @returns {string} The created folder name
 */
function createDemoLessonFolder(eventID, eventName) {
  // try {
  //   const studentsFolderId = '11KrhsdqEpjUdMMGsNC67WRiS-gG1TAIV'; // Parent folder ID
  //   const studentsFolder = DriveApp.getFolderById(studentsFolderId);

  //   // Create a folder name from the event name
  //   const folderName = `Demo - ${eventName}`;

  //   // Check if folder already exists
  //   const existingFolders = studentsFolder.getFoldersByName(folderName);
  //   if (existingFolders.hasNext()) {
  //     Logger.log(`Folder already exists for demo: ${folderName}`);
  //     return folderName;
  //   }

  //   // Fetch template IDs from the "Code" sheet
  //   const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  //   const codeSheet = spreadsheet.getSheetByName("Code");
  //   const lessonNoteDocId = codeSheet.getRange("E2").getValue();
  //   const lessonHistorySheetId = codeSheet.getRange("E4").getValue();

  //   if (!lessonNoteDocId || !lessonHistorySheetId) {
  //     throw new Error("Template file IDs are missing in the 'Code' sheet.");
  //   }

  //   // Comment out folder creation logic for debugging
  //   const demoFolder = studentsFolder.createFolder(folderName);
  //   demoFolder.createFolder("Lesson Notes");
  //   demoFolder.createFolder("Evaluation");
  //   const lessonNoteDocTemplate = DriveApp.getFileById(lessonNoteDocId);
  //   lessonNoteDocTemplate.makeCopy("Lesson Note", demoFolder);
  //   const lessonHistorySheetTemplate = DriveApp.getFileById(lessonHistorySheetId);
  //   const copiedLessonHistorySheet = lessonHistorySheetTemplate.makeCopy("Lesson History", demoFolder);
  //   const copiedSheet = SpreadsheetApp.openById(copiedLessonHistorySheet.getId());
  //   const firstSheet = copiedSheet.getSheets()[0];
  //   firstSheet.getRange("A1").setValue("Demo Lesson");
  //   Logger.log(`[DEBUG] Would create demo folder: ${folderName}`);

  //   Logger.log(`Created folder for demo lesson: ${folderName}`);
  //   return folderName;
  // } catch (error) {
  //   Logger.log(`Error creating folder for demo lesson: ${error.message}`);
  //   throw error;
  // }
}

/**
 * Creates a folder for a demo lesson with detailed information and updates the event
 * @param {Object} payload - Object containing lesson details
 * @param {string} payload.lessonType - Type of lesson (Regular, Kids, Kids [Group], Group)
 * @param {string} payload.studentNumber - Student number (3 digits)
 * @param {Array} payload.studentNames - Array of student names
 * @param {string} payload.folderName - Generated folder name
 * @param {string} payload.eventID - Calendar event ID
 * @returns {Object} Result object with success status and folder name
 */
function createDemoLessonFolderWithDetails(payload) {
  try {
    const { lessonType, studentNumber, studentNames, folderName, eventID } = payload;
    
    Logger.log(`Creating demo lesson folder with details: ${JSON.stringify(payload)}`);
    
    const studentsFolderId = '11KrhsdqEpjUdMMGsNC67WRiS-gG1TAIV'; // Parent folder ID
    const studentsFolder = DriveApp.getFolderById(studentsFolderId);

    // Check if folder already exists
    const existingFolders = studentsFolder.getFoldersByName(folderName);
    if (existingFolders.hasNext()) {
      Logger.log(`Folder already exists: ${folderName}`);
      return { success: true, folderName: folderName, message: 'Folder already exists' };
    }

    // Fetch template IDs from the "Code" sheet
    const spreadsheet = STUDENTLIST;
    const codeSheet = spreadsheet.getSheetByName("Code");
    
    // Temporarily skip template creation for testing
    let lessonNoteDocId = null;
    let lessonHistorySheetId = null;
    
    if (codeSheet) {
      lessonNoteDocId = codeSheet.getRange("E2").getValue();
      lessonHistorySheetId = codeSheet.getRange("E4").getValue();
    }

    // Create the main folder
    const mainFolder = studentsFolder.createFolder(folderName);
    
    // Create subfolders with student names
    const lessonNotesFolder = mainFolder.createFolder(`${studentNames.join(' & ')}'s Lesson Notes`);
    const evaluationFolder = mainFolder.createFolder(`${studentNames.join(' & ')}'s Evaluation`);
    
    // Only create template files if IDs are provided
    if (lessonNoteDocId && lessonHistorySheetId) {
      // Create lesson note document with student name (possessive format)
      const lessonNoteDocTemplate = DriveApp.getFileById(lessonNoteDocId);
      const lessonNoteFileName = `${studentNames.join(' & ')}'s Lesson Note`;
      const lessonNoteDoc = lessonNoteDocTemplate.makeCopy(lessonNoteFileName, mainFolder);
      
      // Create lesson history spreadsheet with student name (possessive format)
      const lessonHistorySheetTemplate = DriveApp.getFileById(lessonHistorySheetId);
      const lessonHistoryFileName = `${studentNames.join(' & ')}'s Lesson History`;
      const copiedLessonHistorySheet = lessonHistorySheetTemplate.makeCopy(lessonHistoryFileName, mainFolder);
      const copiedSheet = SpreadsheetApp.openById(copiedLessonHistorySheet.getId());
      const firstSheet = copiedSheet.getSheets()[0];
      
      // Set the student name in the history sheet
      const studentNameText = studentNames.join(' & ');
      firstSheet.getRange("A1").setValue(studentNameText);
      
      // Add student information to the Student List sheet
      addStudentToStudentList(studentNames, folderName, lessonNoteDoc.getUrl(), copiedLessonHistorySheet.getUrl());
    } else {
      Logger.log('Template file IDs not found - skipping template creation');
      // Add student information to the Student List sheet without URLs
      addStudentToStudentList(studentNames, folderName, '', '');
    }
    
    // Update the lessons_today sheet to mark this as a regular lesson (not demo)
    updateDemoLessonToRegular(eventID, folderName, studentNames);
    
    // Increment the lesson type ID
    incrementLessonTypeID(lessonType);
    
    Logger.log(`Successfully created folder: ${folderName}`);
    return { success: true, folderName: folderName };
    
  } catch (error) {
    Logger.log(`Error creating demo lesson folder: ${error.message}`);
    throw error;
  }
}

/**
 * Gets the next available student number for a given lesson type
 * @param {string} lessonType - The lesson type (Regular, Kids, Group)
 * @returns {string} The next available 3-digit student number
 */
function getNextStudentNumber(lessonType) {
  try {
    const spreadsheet = STUDENTLIST;
    const codeSheet = spreadsheet.getSheetByName("Code");
    const codeData = codeSheet.getDataRange().getValues();
    
    // Find the row for the lesson type
    for (let i = 1; i < codeData.length; i++) {
      let type = codeData[i][0];
      // Unify Kids and Kids [Group] as 'Kids'
      if (type && (type === 'Kids' || type === 'Kids [Group]')) type = 'Kids';
      
      if (type && type.toString().trim() === lessonType.toString().trim()) {
        const currentID = parseInt(codeData[i][1], 10);
        if (!isNaN(currentID)) {
          // Return the current ID (it will be incremented when folder is created)
          return currentID.toString().padStart(3, '0');
        }
      }
    }
    
    // Default fallback
    return '001';
  } catch (error) {
    Logger.log(`Error getting next student number: ${error.message}`);
    return '001';
  }
}

/**
 * Adds student information to the Student List sheet
 * @param {Array} studentNames - Array of student names
 * @param {string} folderName - The folder name
 * @param {string} noteUrl - URL to the lesson note document
 * @param {string} historyUrl - URL to the lesson history spreadsheet
 */
function addStudentToStudentList(studentNames, folderName, noteUrl, historyUrl) {
  try {
    const studentSheet = STUDENTLIST.getSheetByName('Student List');
    const data = studentSheet.getDataRange().getValues();
    
    // Find the next empty row
    const nextRow = data.length + 1;
    
    // Extract lesson type and ID from folder name
    // Folder name format: "K053 Khacey Salvador" or "053 Khacey Salvador"
    let lessonType = 'Regular';
    let studentId = '';
    
    if (folderName) {
      const parts = folderName.split(' ');
      if (parts.length >= 2) {
        const idPart = parts[0];
        if (idPart.startsWith('K')) {
          lessonType = 'Kids';
          studentId = idPart.substring(1); // Remove 'K' prefix
        } else if (idPart.startsWith('M')) {
          lessonType = 'Group';
          studentId = idPart.substring(1); // Remove 'M' prefix
        } else {
          lessonType = 'Regular';
          studentId = idPart;
        }
      }
    }
    
    // Prepare the row data
    const studentName = studentNames.join(' & '); // Join multiple names with ' & '
    const rowData = [
      lessonType, // Column A (Lesson Type)
      studentId, // Column B (ID)
      studentName, // Column C (Student Name)
      folderName, // Column D (Student Folder)
      '', // Column E (Level - empty for now)
      '', // Column F (Book - empty for now)
      noteUrl, // Column G (Note)
      historyUrl // Column H (History)
    ];
    
    // Insert the new row
    studentSheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    Logger.log(`Added student to Student List: ${studentName} with folder: ${folderName}, type: ${lessonType}, ID: ${studentId}`);
  } catch (error) {
    Logger.log(`Error adding student to Student List: ${error.message}`);
    throw error;
  }
}

/**
 * Updates a demo lesson event to become a regular lesson
 * @param {string} eventID - The calendar event ID
 * @param {string} folderName - The new folder name
 * @param {Array} studentNames - Array of student names
 */
function updateDemoLessonToRegular(eventID, folderName, studentNames) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sht = ss.getSheetByName('lessons_today');
    const data = sht.getDataRange().getValues();
    const hdrs = data.shift();

    for (let r = 0; r < data.length; r++) {
      if (data[r][hdrs.indexOf('eventID')] === eventID) {
        // Update the row with new information
        const studentName = studentNames.join(' & ');
        sht.getRange(r + 2, hdrs.indexOf('studentNames') + 1).setValue(studentName);
        sht.getRange(r + 2, hdrs.indexOf('folderName') + 1).setValue(folderName);
        sht.getRange(r + 2, hdrs.indexOf('pdfUpload') + 1).setValue('FALSE');
        sht.getRange(r + 2, hdrs.indexOf('lessonHistory') + 1).setValue('FALSE');
        
        Logger.log(`Updated demo lesson to regular: ${eventID} -> ${folderName}`);
        return;
      }
    }
    
    Logger.log(`Event ID not found in lessons_today: ${eventID}`);
  } catch (error) {
    Logger.log(`Error updating demo lesson to regular: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches the Note and History URLs for a given folder name from the 'Student List' sheet.
 * @param {string} folderName The folder name to look up (can be multiple names separated by commas for group lessons).
 * @returns {{noteUrl: string, historyUrl: string}|null} An object with the URLs, or null if not found.
 */
function getStudentLinks(folderName) {
  try {
    const studentSheet = STUDENTLIST.getSheetByName('Student List');
    if (!studentSheet) {
      Logger.log('Student List sheet not found');
      return null;
    }
    const data = studentSheet.getDataRange().getValues();

    // Column indices from the spreadsheet:
    // D: Student Folder (index 3)
    // G: Note (index 6)
    // H: History (index 7)
    const FOLDER_COL_IDX = 3;
    const NOTE_COL_IDX = 6;
    const HISTORY_COL_IDX = 7;

    // Handle group lessons - split by comma and take the first folder
    const folderNames = folderName.split(',').map(name => name.trim());
    const firstFolderName = folderNames[0];

    for (let i = 1; i < data.length; i++) { // Start from row 2 (index 1) to skip header
      if (data[i][FOLDER_COL_IDX] && data[i][FOLDER_COL_IDX].toString().trim() === firstFolderName) {
        return {
          noteUrl: data[i][NOTE_COL_IDX],
          historyUrl: data[i][HISTORY_COL_IDX]
        };
      }
    }

    Logger.log(`Folder not found in Student List: "${firstFolderName}"`);
    return null; // Folder not found
  } catch (e) {
    Logger.log(`Error in getStudentLinks for folder "${folderName}": ${e.toString()}`);
    return { error: e.toString() };
  }
}

/**
 * Extracts student name from a demo lesson event name
 * @param {string} eventName - The full event name (e.g. "John Smith D/L")
 * @returns {string} The student name (e.g. "John Smith")
 */
function extractStudentNameFromDemo(eventName) {
  // Split by D/L and take the first part, then trim any whitespace
  return eventName.split(/D\/L/i)[0].trim();
}

/**
 * Changes the color of a calendar event based on evaluation tags
 * @param {string} eventID - The calendar event ID
 * @param {string} color - The color to set (e.g., 'red', 'blue', 'green', etc.)
 */
function changeEventColor(eventID, color) {
  try {
    // Try to find the event in both calendars
    const calMain = CalendarApp.getCalendarById(CALENDAR_ID);
    const calDemo = CalendarApp.getCalendarById(DEMO_CALENDAR_ID);
    
    let event = null;
    
    // Search in main calendar
    if (calMain) {
      try {
        event = calMain.getEventById(eventID);
      } catch (e) {
        Logger.log('Event not found in main calendar: ' + eventID);
      }
    }
    
    // If not found in main calendar, search in demo calendar
    if (!event && calDemo) {
      try {
        event = calDemo.getEventById(eventID);
      } catch (e) {
        Logger.log('Event not found in demo calendar: ' + eventID);
      }
    }
    
    if (event) {
      event.setColor(color);
      Logger.log('Changed event color to ' + color + ' for event: ' + eventID);
      return { success: true, message: 'Event color updated successfully' };
    } else {
      throw new Error('Event not found in any calendar');
    }
  } catch (error) {
    Logger.log('Error changing event color: ' + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Web method: Given a folderName, returns all student names from the Student List sheet that match it.
 * @param {string} folderName
 * @returns {string[]} Array of student names
 */
function getStudentNamesByFolder(folderName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('Student List');
  if (!studentSheet) throw new Error('Student List sheet not found');
  
  const data = studentSheet.getDataRange().getValues();
  const names = [];
  
  for (let i = 1; i < data.length; i++) {
    const studentFolder = data[i][3]; // Folder column
    if (studentFolder === folderName) {
      names.push(data[i][2]); // Name column
    }
  }
  
  return names;
}

/**
 * Fetches evaluation data for a specific student from the "Evaluation" sheet
 * @param {string} studentName - The name of the student
 * @returns {Array} Array of evaluation objects sorted by evaluation number
 */
function getStudentEvaluations(studentName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const evalSheet = ss.getSheetByName('Evaluation');
  if (!evalSheet) throw new Error('Evaluation sheet not found');
  
  const data = evalSheet.getDataRange().getValues();
  if (data.length < 2) return []; // No data
  
  const headers = data.shift();
  const evaluations = [];
  
  // Find column indices
  const studentIdCol = headers.indexOf('Student ID');
  const evalNumCol = headers.indexOf('Evaluation Number');
  const evalDateCol = headers.indexOf('Evaluation Number and Date');
  const grammarCol = headers.indexOf('Grammar');
  const vocabCol = headers.indexOf('Vocabulary');
  const speakingCol = headers.indexOf('Speaking');
  const listeningCol = headers.indexOf('Listening');
  const readingCol = headers.indexOf('Reading');
  const writingCol = headers.indexOf('Writing');
  const fluencyCol = headers.indexOf('Fluency');
  const selfStudyCol = headers.indexOf('Self-Study');
  
  // Filter rows for the specific student
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const studentId = row[studentIdCol];
    
    // Check if this row belongs to the student
    if (studentId && studentId.toString().includes(studentName)) {
      const evaluation = {
        evaluationNumber: row[evalNumCol] || '',
        evaluationDate: row[evalDateCol] || '',
        grammar: row[grammarCol] || '',
        vocabulary: row[vocabCol] || '',
        speaking: row[speakingCol] || '',
        listening: row[listeningCol] || '',
        reading: row[readingCol] || '',
        writing: row[writingCol] || '',
        fluency: row[fluencyCol] || '',
        selfStudy: row[selfStudyCol] || ''
      };
      evaluations.push(evaluation);
    }
  }
  
  // Sort by evaluation number (convert to number for proper sorting)
  evaluations.sort((a, b) => {
    const aNum = parseInt(a.evaluationNumber) || 0;
    const bNum = parseInt(b.evaluationNumber) || 0;
    return aNum - bNum;
  });
  
  return evaluations;
}

