/**
 * Legacy / reference implementations; not used by the app.
 * Preserved for reference or future restoration.
 */

/**
 * Legacy: Creates folders and files for students (reference implementation).
 * @param {string} eventName - The event name
 * @param {string[]} students - Array of student names
 * @returns {string} The created folder name
 */
function createFoldersForStudents_legacy(eventName, students) {
  try {
    const studentsFolderId = '11KrhsdqEpjUdMMGsNC67WRiS-gG1TAIV'; // Parent folder ID
    const studentsFolder = DriveApp.getFolderById(studentsFolderId);

    let { type: lessonType, prefix } = determineLessonTypeAndPrefix(eventName);
    if (lessonType === 'Kids' || lessonType === 'Kids [Group]') lessonType = 'Kids';

    const spreadsheet = STUDENTLIST;
    const codeSheet = spreadsheet.getSheetByName("Code");
    const codeData = codeSheet.getDataRange().getValues();
    let lessonTypeID = '';
    for (let i = 1; i < codeData.length; i++) {
      let type = codeData[i][0];
      if (type && (type === 'Kids' || type === 'Kids [Group]')) type = 'Kids';
      if (type && type.toString().trim() === lessonType.toString().trim()) {
        lessonTypeID = codeData[i][1];
        break;
      }
    }
    if (!lessonTypeID) {
      Logger.log(`Lesson type ID not found for: ${lessonType}`);
      lessonTypeID = 'UNKNOWN';
    }

    const cleanStudents = students.map(s => s.replace(/子/g, '').trim());
    const concatenatedNames = formatStudentNames(cleanStudents);
    const folderName = `${prefix}${lessonTypeID} ${concatenatedNames}`;

    const existingFolders = studentsFolder.getFoldersByName(folderName);
    if (existingFolders.hasNext()) {
      Logger.log(`Folder already exists for group: ${folderName}`);
      return folderName;
    }

    const lessonNoteDocId = codeSheet.getRange("E2").getValue();
    const lessonHistorySheetId = codeSheet.getRange("E4").getValue();

    if (!lessonNoteDocId || !lessonHistorySheetId) {
      throw new Error("Template file IDs are missing in the 'Code' sheet.");
    }

    const groupFolder = studentsFolder.createFolder(folderName);
    groupFolder.createFolder(`${concatenatedNames}'s Lesson Notes`);
    groupFolder.createFolder(`${concatenatedNames}'s Evaluation`);
    const lessonNoteDocTemplate = DriveApp.getFileById(lessonNoteDocId);
    lessonNoteDocTemplate.makeCopy(`${concatenatedNames}'s Lesson Note`, groupFolder);
    const lessonHistorySheetTemplate = DriveApp.getFileById(lessonHistorySheetId);
    const copiedLessonHistorySheet = lessonHistorySheetTemplate.makeCopy(`${concatenatedNames}'s Lesson History`, groupFolder);
    const copiedSheet = SpreadsheetApp.openById(copiedLessonHistorySheet.getId());
    const firstSheet = copiedSheet.getSheets()[0];
    firstSheet.getRange("A1").setValue(`${concatenatedNames}'s`);

    Logger.log(`Folders, files, and sheet content updated for group: ${folderName}`);

    incrementLessonTypeID(lessonType);
    fetchAndCacheTodayLessons();

    return folderName;
  } catch (error) {
    Logger.log(`Error creating folder for group: ${eventName}. Error: ${error.message}`);
    throw error;
  }
}

/**
 * Legacy: Creates a folder for a demo lesson (reference implementation).
 * @param {string} eventID - The ID of the demo lesson event
 * @param {string} eventName - The name of the demo lesson
 * @returns {string} The created folder name
 */
function createDemoLessonFolder_legacy(eventID, eventName) {
  try {
    const studentsFolderId = '11KrhsdqEpjUdMMGsNC67WRiS-gG1TAIV'; // Parent folder ID
    const studentsFolder = DriveApp.getFolderById(studentsFolderId);

    const folderName = `Demo - ${eventName}`;

    const existingFolders = studentsFolder.getFoldersByName(folderName);
    if (existingFolders.hasNext()) {
      Logger.log(`Folder already exists for demo: ${folderName}`);
      return folderName;
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const codeSheet = spreadsheet.getSheetByName("Code");
    const lessonNoteDocId = codeSheet.getRange("E2").getValue();
    const lessonHistorySheetId = codeSheet.getRange("E4").getValue();

    if (!lessonNoteDocId || !lessonHistorySheetId) {
      throw new Error("Template file IDs are missing in the 'Code' sheet.");
    }

    const demoFolder = studentsFolder.createFolder(folderName);
    demoFolder.createFolder("Lesson Notes");
    demoFolder.createFolder("Evaluation");
    const lessonNoteDocTemplate = DriveApp.getFileById(lessonNoteDocId);
    lessonNoteDocTemplate.makeCopy("Lesson Note", demoFolder);
    const lessonHistorySheetTemplate = DriveApp.getFileById(lessonHistorySheetId);
    const copiedLessonHistorySheet = lessonHistorySheetTemplate.makeCopy("Lesson History", demoFolder);
    const copiedSheet = SpreadsheetApp.openById(copiedLessonHistorySheet.getId());
    const firstSheet = copiedSheet.getSheets()[0];
    firstSheet.getRange("A1").setValue("Demo Lesson");
    Logger.log(`[DEBUG] Would create demo folder: ${folderName}`);

    Logger.log(`Created folder for demo lesson: ${folderName}`);
    return folderName;
  } catch (error) {
    Logger.log(`Error creating folder for demo lesson: ${error.message}`);
    throw error;
  }
}
