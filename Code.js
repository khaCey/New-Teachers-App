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
 * Returns an array of { eventID, pdfUpload, lessonHistory } 
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
      lessonHistory: lh
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
        lessonHistory: status.lessonHistory
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

    let lastName = '';
    if (names.length > 1) {
      const lp = names[names.length - 1].split(/\s+/);
      if (lp.length > 1) lastName = lp.pop();
    }

    names.forEach(nm => {
      const parts = nm.split(/\s+/);
      const fullName = (parts.length > 1) ? nm : (parts[0] + (lastName ? ' ' + lastName : ''));
      let folderName = studentMap[ fullName.trim() ] || '';
      if (/D\/L/i.test(title) && !folderName) {
        const demoStudentName = extractStudentNameFromDemo(title);
        folderName = demoStudentName + ' DEMO';
        Logger.log('Demo lesson with no folder: event "%s", using folderName "%s"', title, folderName);
      }
      flat.push({
        eventID:       event.getId(),
        eventName:     title,
        Start:         Utilities.formatDate(rawStart, tz, 'HH:mm'),
        End:           Utilities.formatDate(rawEnd,   tz, 'HH:mm'),
        studentName:   fullName.trim(),
        folderName:    folderName,
        pdfUpload:     false,
        lessonHistory: false
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
        lessonHistory: item.lessonHistory
      };
    } else {
      grouped[item.eventID].studentNames.push(item.studentName);
    }
  });
  const lessons = Object.values(grouped);
  Logger.log('Grouped into %s lessons', lessons.length);

  // 6) Merge old statuses
  lessons.forEach(lesson => {
    const oldStatus = oldStatusMap[lesson.eventID];
    if (oldStatus) {
      lesson.pdfUpload = oldStatus.pdfUpload;
      lesson.lessonHistory = oldStatus.lessonHistory;
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
    'folderName', 'studentNames', 'pdfUpload', 'lessonHistory'
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
      l.lessonHistory
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
  fetchAndCacheTodayLessons('17/06/2025');
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
 * Extracts student name from a demo lesson event name
 * @param {string} eventName - The full event name (e.g. "John Smith D/L")
 * @returns {string} The student name (e.g. "John Smith")
 */
function extractStudentNameFromDemo(eventName) {
  // Split by D/L and take the first part, then trim any whitespace
  return eventName.split(/D\/L/i)[0].trim();
}

