export var HabitStatus;
(function (HabitStatus) {
    HabitStatus["ACTIVE"] = "ACTIVE";
    HabitStatus["ARCHIVED"] = "ARCHIVED";
    HabitStatus["PAUSED"] = "PAUSED";
})(HabitStatus || (HabitStatus = {}));
export var ScheduleType;
(function (ScheduleType) {
    ScheduleType["DAILY"] = "DAILY";
    ScheduleType["SPECIFIC_DAYS"] = "SPECIFIC_DAYS";
    ScheduleType["FLEXIBLE"] = "FLEXIBLE";
})(ScheduleType || (ScheduleType = {}));
export var RoomVisibility;
(function (RoomVisibility) {
    RoomVisibility["PUBLIC"] = "PUBLIC";
    RoomVisibility["PRIVATE"] = "PRIVATE";
})(RoomVisibility || (RoomVisibility = {}));
export var RoomRole;
(function (RoomRole) {
    RoomRole["OWNER"] = "OWNER";
    RoomRole["ADMIN"] = "ADMIN";
    RoomRole["MEMBER"] = "MEMBER";
})(RoomRole || (RoomRole = {}));
export var ActivityType;
(function (ActivityType) {
    ActivityType["HABIT_COMPLETED"] = "HABIT_COMPLETED";
    ActivityType["STREAK_MILESTONE"] = "STREAK_MILESTONE";
    ActivityType["PERSONAL_BEST"] = "PERSONAL_BEST";
    ActivityType["ROOM_JOIN"] = "ROOM_JOIN";
    ActivityType["LEVEL_UP"] = "LEVEL_UP";
})(ActivityType || (ActivityType = {}));
