# Noema Bug Report

*Last Updated: January 3, 2026*

This document tracks bugs discovered during application testing.

---

## Bug #1: Schema Inference Issues

**Status:** Open
**Severity:** High
**Component:** Data Import / Schema Detection

**Description:**
Schema inference is not working correctly when importing data files. The system fails to properly detect column types or misidentifies data types during the import process.

**Steps to Reproduce:**
1. Import a CSV file with mixed data types
2. Observe the inferred schema

**Expected Behavior:**
Schema should accurately detect column types (text, number, date, etc.)

**Actual Behavior:**
Schema inference produces incorrect or incomplete type detection.

---

## Bug #2: View Creation Issues

**Status:** Open
**Severity:** High
**Component:** Views

**Description:**
Creating new views does not work as expected. Users encounter problems when attempting to create or save views.

**Steps to Reproduce:**
1. Navigate to a set
2. Attempt to create a new view

**Expected Behavior:**
View should be created successfully and be accessible.

**Actual Behavior:**
View creation fails or behaves unexpectedly.

---

## Bug #3: UI Truncation Issues

**Status:** Open
**Severity:** Medium
**Component:** UI / Display

**Description:**
Text content in the UI is being truncated inappropriately, hiding important information from users.

**Steps to Reproduce:**
1. View records or fields with longer text content
2. Observe truncation behavior

**Expected Behavior:**
Text should either be fully visible or have a clear way to expand/view full content.

**Actual Behavior:**
Text is truncated without adequate means to view the complete content.

---

## Bug #4: Unresponsive "Add Source" Area

**Status:** Open
**Severity:** High
**Component:** Data Sources

**Description:**
The "Add Source" area/button is unresponsive when users attempt to add a new data source to a set.

**Steps to Reproduce:**
1. Navigate to a set
2. Attempt to use the "Add Source" functionality
3. Click on the add source area

**Expected Behavior:**
The add source interface should open, allowing users to select or upload a source.

**Actual Behavior:**
Nothing happens when clicking on the "Add Source" area - the UI does not respond.

---

## Bug #5: Non-Functional "New Field" Command

**Status:** Open
**Severity:** High
**Component:** Fields / Schema

**Description:**
The "New Field" command does not work, preventing users from adding new fields to their sets.

**Steps to Reproduce:**
1. Open a set
2. Attempt to use the "New Field" command or button

**Expected Behavior:**
A dialog or interface should appear allowing users to define a new field.

**Actual Behavior:**
The command does not execute or produce any visible effect.

---

## Bug #6: Cannot View Records of Large Dataset

**Status:** Open
**Severity:** Critical
**Component:** Data Display / Record Viewing

**Description:**
After importing the `organizations-100000.csv` dataset (100,000 records), users are unable to view the records of the newly created set.

**Steps to Reproduce:**
1. Import the `organizations-100000.csv` file
2. Wait for import to complete
3. Attempt to view records in the created set

**Expected Behavior:**
Records should load and be viewable in the data grid/table view.

**Actual Behavior:**
Records cannot be viewed - the display may hang, show empty, or fail to load.

**Notes:**
This may be a performance issue related to handling large datasets.

---

## Summary

| Bug # | Title | Severity | Component |
|-------|-------|----------|-----------|
| 1 | Schema Inference Issues | High | Data Import |
| 2 | View Creation Issues | High | Views |
| 3 | UI Truncation Issues | Medium | UI / Display |
| 4 | Unresponsive "Add Source" Area | High | Data Sources |
| 5 | Non-Functional "New Field" Command | High | Fields / Schema |
| 6 | Cannot View Records of Large Dataset | Critical | Data Display |

---

## Testing Environment

- **Application:** Noema
- **Testing Date:** January 3, 2026
- **Test Data:** `organizations-100000.csv` (100,000 records)
