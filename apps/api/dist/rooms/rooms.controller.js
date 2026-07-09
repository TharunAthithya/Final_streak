"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const rooms_service_1 = require("./rooms.service");
let RoomsController = class RoomsController {
    constructor(roomsService) {
        this.roomsService = roomsService;
    }
    getRooms(user) {
        return this.roomsService.getRooms(user.id);
    }
    createRoom(user, dto) {
        return this.roomsService.createRoom(user.id, dto);
    }
    joinRoom(user, dto) {
        return this.roomsService.joinRoom(user.id, dto);
    }
    leaveRoom(user, id) {
        return this.roomsService.leaveRoom(user.id, id);
    }
    getRoomDetails(user, id) {
        return this.roomsService.getRoomDetails(user.id, id);
    }
    createRoomHabit(user, id, name, description) {
        return this.roomsService.createRoomHabit(user.id, id, name, description);
    }
    archiveRoomHabit(user, id, roomHabitId) {
        return this.roomsService.archiveRoomHabit(user.id, id, roomHabitId);
    }
    linkPersonalHabit(user, id, roomHabitId, personalHabitId) {
        return this.roomsService.linkPersonalHabit(user.id, id, roomHabitId, personalHabitId);
    }
    unlinkPersonalHabit(user, id, roomHabitId) {
        return this.roomsService.unlinkPersonalHabit(user.id, id, roomHabitId);
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "getRooms", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "createRoom", null);
__decorate([
    (0, common_1.Post)('join'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "joinRoom", null);
__decorate([
    (0, common_1.Post)(':id/leave'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "leaveRoom", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "getRoomDetails", null);
__decorate([
    (0, common_1.Post)(':id/habits'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('name')),
    __param(3, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "createRoomHabit", null);
__decorate([
    (0, common_1.Post)(':id/habits/:roomHabitId/archive'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('roomHabitId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "archiveRoomHabit", null);
__decorate([
    (0, common_1.Post)(':id/habits/:roomHabitId/link'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('roomHabitId')),
    __param(3, (0, common_1.Body)('personalHabitId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "linkPersonalHabit", null);
__decorate([
    (0, common_1.Post)(':id/habits/:roomHabitId/unlink'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('roomHabitId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "unlinkPersonalHabit", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)('rooms'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map