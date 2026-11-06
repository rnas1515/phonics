# Several children on one device

- **Add / manage:** Tutor view (PIN) -> **Children** tab: add up to 6 children (first name + picture), rename, change the
  picture, switch, or delete a child and all their progress. A quick "Child shown below" switcher sits at the top of the tutor view.
- **Picking:** with 2 or more children, each new visit starts with **Who's playing?**; a chip in the top bar switches child.
  With one child nothing changes (no picker, no chip). The picker is a convenience, not a security boundary.
- **Separate per child:** progress, points, badges, check-up results, trouble words, reward tokens and game sessions,
  and the "active skills" choices.
- **Shared by everyone:** the tutor PIN, voice settings, game rules, and added lessons.
- **Storage:** the original child keeps the original keys (`wd.progress.v1`), so data saved before this feature is still theirs.
  Others use `wd.progress.<id>` / `wd.profile.<id>`. Nothing leaves the device.
- **Backups:** "Export backup (this child)" saves the child shown; "Restore backup" restores into the child shown.
  Progress is per device, so a child's progress does not follow them to another device except through a backup.
