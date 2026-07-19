import { createClient } from '@supabase/supabase-js';
export class StreakApiClient {
    supabase;
    constructor(supabaseUrl, supabaseAnonKey, options) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey, options);
    }
    // Auth & Profile CRUD
    async getMe() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (error)
            throw new Error(error.message);
        return {
            id: data.id,
            email: user.email || '',
            displayName: data.display_name,
            username: data.username,
            avatarPath: data.avatar_url,
            bio: data.bio,
            timezone: data.timezone,
            xp: data.xp,
            level: data.level,
            onboardingCompletedAt: data.onboarding_completed_at,
            createdAt: data.created_at,
        };
    }
    async updateProfile(dto) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase
            .from('profiles')
            .update({
            display_name: dto.displayName,
            username: dto.username,
            timezone: dto.timezone,
            bio: dto.bio,
            avatar_url: dto.avatarPath,
            updated_at: new Date().toISOString(),
        })
            .eq('id', user.id)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return {
            id: data.id,
            email: user.email || '',
            displayName: data.display_name,
            username: data.username,
            avatarPath: data.avatar_url,
            bio: data.bio,
            timezone: data.timezone,
            xp: data.xp,
            level: data.level,
            onboardingCompletedAt: data.onboarding_completed_at,
            createdAt: data.created_at,
        };
    }
    // Habits Simple CRUD (direct table queries)
    async getHabits(includeArchived = false) {
        const todayStr = new Date().toISOString().split('T')[0];
        const query = this.supabase
            .from('habits')
            .select('*, habit_stats(*), check_ins(id, local_date)');
        if (!includeArchived) {
            query.eq('status', 'ACTIVE');
        }
        const { data, error } = await query;
        if (error)
            throw new Error(error.message);
        return (data || []).map((h) => {
            const todayCheckIn = h.check_ins?.find((c) => c.local_date === todayStr);
            const completedToday = !!todayCheckIn;
            const todayCheckInId = todayCheckIn?.id || null;
            return {
                id: h.id,
                userId: h.profile_id,
                name: h.name,
                description: h.description,
                icon: h.icon,
                status: h.status,
                scheduleType: h.schedule_type,
                targetPerWeek: h.target_per_week,
                timezone: h.timezone,
                startDate: h.start_date,
                reminderTime: h.reminder_time,
                completedToday,
                todayCheckInId,
                archivedAt: h.archived_at,
                createdAt: h.created_at,
                stats: h.habit_stats ? {
                    currentStreak: h.habit_stats.current_streak,
                    bestStreak: h.habit_stats.best_streak,
                    totalCompletions: h.habit_stats.total_completions,
                    completionRate: Number(h.habit_stats.completion_rate),
                } : undefined,
                checkIns: h.check_ins?.map((c) => ({ id: c.id, localDate: c.local_date })) || [],
            };
        });
    }
    async createHabit(dto) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        // 1. Insert Habit
        const { data: habit, error } = await this.supabase
            .from('habits')
            .insert({
            profile_id: user.id,
            name: dto.name,
            description: dto.description,
            icon: dto.icon,
            schedule_type: dto.scheduleType,
            target_per_week: dto.targetPerWeek,
            timezone: dto.timezone,
            start_date: dto.startDate,
            reminder_time: dto.reminderTime,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        // 2. Insert schedule days if specific
        if (dto.scheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek) {
            const scheduleDays = dto.daysOfWeek.map((day) => ({
                habit_id: habit.id,
                day_of_week: day,
            }));
            const { error: daysError } = await this.supabase
                .from('habit_schedule_days')
                .insert(scheduleDays);
            if (daysError)
                throw new Error(daysError.message);
        }
        return {
            id: habit.id,
            userId: habit.profile_id,
            name: habit.name,
            description: habit.description,
            icon: habit.icon,
            status: habit.status,
            scheduleType: habit.schedule_type,
            targetPerWeek: habit.target_per_week,
            timezone: habit.timezone,
            startDate: habit.start_date,
            reminderTime: habit.reminder_time,
            archivedAt: habit.archived_at,
            createdAt: habit.created_at,
        };
    }
    async getHabitCheckIns(habitId, limit = 14) {
        const { data, error } = await this.supabase
            .from('check_ins')
            .select('*')
            .eq('habit_id', habitId)
            .order('local_date', { ascending: false })
            .limit(limit);
        if (error)
            throw new Error(error.message);
        return (data || []).map((c) => ({
            id: c.id,
            userId: c.profile_id,
            habitId: c.habit_id,
            localDate: c.local_date,
            completedAtUtc: c.completed_at_utc,
            timezoneAtCompletion: c.timezone_at_completion,
            source: c.source,
        }));
    }
    async deleteHabit(habitId) {
        const { error } = await this.supabase
            .from('habits')
            .delete()
            .eq('id', habitId);
        if (error)
            throw new Error(error.message);
        return { success: true };
    }
    // Complex Operations via Direct RPC Database Calls
    async checkInHabit(habitId, dto) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase.rpc('complete_habit', {
            p_profile_id: user.id,
            p_habit_id: habitId,
            p_local_date: dto.localDate,
            p_timezone: dto.timezoneAtCompletion,
            p_idempotency_key: dto.idempotencyKey,
        });
        if (error)
            throw new Error(error.message);
        return {
            checkIn: {
                id: data.checkInId,
                userId: user.id,
                habitId,
                localDate: dto.localDate,
                completedAtUtc: new Date().toISOString(),
                timezoneAtCompletion: dto.timezoneAtCompletion,
                source: 'mobile',
            },
            stats: {
                currentStreak: data.stats.currentStreak,
                bestStreak: data.stats.bestStreak,
                totalCompletions: data.stats.totalCompletions,
            },
            xpAwarded: data.xpAwarded,
            levelUp: data.levelUp,
        };
    }
    async undoCheckIn(habitId, checkInId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase.rpc('undo_complete_habit', {
            p_profile_id: user.id,
            p_habit_id: habitId,
            p_check_in_id: checkInId,
        });
        if (error)
            throw new Error(error.message);
        return {
            currentStreak: data.currentStreak,
            bestStreak: data.bestStreak,
            totalCompletions: data.totalCompletions,
        };
    }
    // Rooms CRUD and RPCs
    async getRooms() {
        const { data, error } = await this.supabase
            .from('rooms')
            .select('*, room_members(count)')
            .is('archived_at', null);
        if (error)
            throw new Error(error.message);
        return (data || []).map((r) => ({
            id: r.id,
            ownerId: r.owner_id,
            name: r.name,
            description: r.description,
            imagePath: r.image_url,
            visibility: r.visibility,
            inviteCode: r.invite_code,
            memberCount: r.room_members?.[0]?.count || 0,
            activeTodayCount: 0,
        }));
    }
    async createRoom(dto) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase.rpc('create_room', {
            p_owner_id: user.id,
            p_name: dto.name,
            p_description: dto.description,
            p_visibility: dto.visibility,
        });
        if (error)
            throw new Error(error.message);
        return {
            id: data.roomId,
            ownerId: user.id,
            name: data.name,
            description: dto.description,
            visibility: dto.visibility,
            inviteCode: data.inviteCode,
            memberCount: 1,
            activeTodayCount: 0,
        };
    }
    async joinRoom(dto) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase.rpc('join_room', {
            p_profile_id: user.id,
            p_invite_code: dto.inviteCode,
        });
        if (error)
            throw new Error(error.message);
        // Fetch joined room info
        const { data: room, error: roomErr } = await this.supabase
            .from('rooms')
            .select('*')
            .eq('id', data.roomId)
            .single();
        if (roomErr)
            throw new Error(roomErr.message);
        return {
            id: room.id,
            ownerId: room.owner_id,
            name: room.name,
            description: room.description,
            imagePath: room.image_url,
            visibility: room.visibility,
            inviteCode: room.invite_code,
            memberCount: 0,
            activeTodayCount: 0,
        };
    }
    async leaveRoom(roomId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase.rpc('leave_room', {
            p_profile_id: user.id,
            p_room_id: roomId,
        });
        if (error)
            throw new Error(error.message);
        return { success: data };
    }
    async getRoomDetails(roomId) {
        // 1. Fetch Room info
        const { data: room, error: roomErr } = await this.supabase
            .from('rooms')
            .select('*, room_members(*, profiles(*)), room_habits(*)')
            .eq('id', roomId)
            .single();
        if (roomErr)
            throw new Error(roomErr.message);
        const members = (room.room_members || []).map((m) => ({
            id: m.id,
            role: m.role,
            user: {
                id: m.profiles.id,
                displayName: m.profiles.display_name,
                username: m.profiles.username,
                avatarPath: m.profiles.avatar_url,
                bio: m.profiles.bio,
                timezone: m.profiles.timezone,
                xp: m.profiles.xp,
                level: m.profiles.level,
                created_at: m.profiles.created_at,
            },
        }));
        const roomHabits = (room.room_habits || []).filter((h) => !h.archived_at).map((h) => ({
            id: h.id,
            name: h.name,
            description: h.description,
        }));
        return {
            id: room.id,
            ownerId: room.owner_id,
            name: room.name,
            description: room.description,
            imagePath: room.image_url,
            visibility: room.visibility,
            inviteCode: room.invite_code,
            memberCount: members.length,
            activeTodayCount: 0,
            roomHabits,
            members,
        };
    }
    async createRoomHabit(roomId, name, description) {
        const { data, error } = await this.supabase
            .from('room_habits')
            .insert({
            room_id: roomId,
            name,
            description,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async archiveRoomHabit(roomId, roomHabitId) {
        const { data, error } = await this.supabase
            .from('room_habits')
            .update({
            archived_at: new Date().toISOString(),
        })
            .eq('id', roomHabitId)
            .eq('room_id', roomId)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async linkPersonalHabit(roomId, roomHabitId, personalHabitId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data: member, error: memberErr } = await this.supabase
            .from('room_members')
            .select('id')
            .eq('room_id', roomId)
            .eq('profile_id', user.id)
            .is('left_at', null)
            .single();
        if (memberErr)
            throw new Error('Not a member of the room');
        const { data, error } = await this.supabase
            .from('room_habit_links')
            .insert({
            room_member_id: member.id,
            room_habit_id: roomHabitId,
            personal_habit_id: personalHabitId,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async unlinkPersonalHabit(roomId, roomHabitId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data: member, error: memberErr } = await this.supabase
            .from('room_members')
            .select('id')
            .eq('room_id', roomId)
            .eq('profile_id', user.id)
            .is('left_at', null)
            .single();
        if (memberErr)
            throw new Error('Not a member of the room');
        const { data, error } = await this.supabase
            .from('room_habit_links')
            .update({
            unlinked_at: new Date().toISOString(),
        })
            .eq('room_member_id', member.id)
            .eq('room_habit_id', roomHabitId)
            .is('unlinked_at', null)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async getRoomActivity(roomId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase
            .from('activities')
            .select('*, profiles(*), reactions(*)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        return (data || []).map((a) => {
            const counts = {};
            const usersReacted = new Set();
            (a.reactions || []).forEach((r) => {
                counts[r.type] = (counts[r.type] || 0) + 1;
                if (r.profile_id === user.id) {
                    usersReacted.add(r.type);
                }
            });
            return {
                id: a.id,
                actorUserId: a.actor_profile_id,
                actorDisplayName: a.profiles.display_name,
                actorAvatarPath: a.profiles.avatar_url,
                roomId: a.room_id,
                habitId: undefined,
                type: a.type,
                message: a.message,
                metadataJson: a.metadata_json,
                createdAt: a.created_at,
                reactions: Object.keys(counts).map((type) => ({
                    type,
                    count: counts[type],
                    userReacted: usersReacted.has(type),
                })),
            };
        });
    }
    async getRoomLeaderboard(roomId, period = 'weekly') {
        const { data, error } = await this.supabase.rpc('get_leaderboard', {
            p_room_id: roomId,
            p_period: period,
        });
        if (error)
            throw new Error(error.message);
        return (data || []).map((row) => ({
            userId: row.profile_id,
            displayName: row.display_name,
            avatarPath: row.avatar_url,
            score: Number(row.score),
            rank: row.rank,
        }));
    }
    async reactToActivity(activityId, type) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data: existing, error: checkError } = await this.supabase
            .from('reactions')
            .select('id')
            .eq('activity_id', activityId)
            .eq('profile_id', user.id)
            .eq('type', type)
            .maybeSingle();
        if (checkError)
            throw new Error(checkError.message);
        if (existing) {
            const { error: delError } = await this.supabase
                .from('reactions')
                .delete()
                .eq('id', existing.id);
            if (delError)
                throw new Error(delError.message);
            return { success: true, reacted: false };
        }
        else {
            const { error: insError } = await this.supabase
                .from('reactions')
                .insert({
                activity_id: activityId,
                profile_id: user.id,
                type,
            });
            if (insError)
                throw new Error(insError.message);
            return { success: true, reacted: true };
        }
    }
    async deleteAccount() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase.rpc('delete_account', {
            p_profile_id: user.id,
        });
        if (error)
            throw new Error(error.message);
        return { success: data };
    }
    async forgotPassword(email, redirectTo) {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });
        if (error)
            throw new Error(error.message);
        return { success: true };
    }
    async resetPassword(newPassword) {
        const { error } = await this.supabase.auth.updateUser({
            password: newPassword,
        });
        if (error)
            throw new Error(error.message);
        return { success: true };
    }
    async getReflectionForDate(localDate) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase
            .from('reflections')
            .select('*')
            .eq('profile_id', user.id)
            .eq('local_date', localDate)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!data)
            return null;
        return {
            id: data.id,
            userId: data.profile_id,
            localDate: data.local_date,
            prompt: data.prompt,
            response: data.response,
            completedAt: data.completed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
    async submitReflection(dto) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user)
            throw new Error('Not authenticated');
        const { data, error } = await this.supabase
            .from('reflections')
            .upsert({
            profile_id: user.id,
            local_date: dto.localDate,
            prompt: dto.prompt,
            response: dto.response || null,
            completed_at: dto.completedAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'profile_id, local_date',
        })
            .select('*')
            .single();
        if (error)
            throw new Error(error.message);
        return {
            id: data.id,
            userId: data.profile_id,
            localDate: data.local_date,
            prompt: data.prompt,
            response: data.response,
            completedAt: data.completed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
}
