import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserResponse, HabitResponse, CheckInResponse, RoomResponse, ActivityResponse, RoomVisibility, HabitStatus, ScheduleType, ActivityType, ReflectionResponse, CreateReflectionDto } from '@streak/contracts';
import { CreateHabitDto, CheckInDto, CreateRoomDto, JoinRoomDto, UpdateUserDto } from '@streak/validation';

export class StreakApiClient {
  public supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseAnonKey: string, options?: any) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, options);
  }

  // Auth & Profile CRUD
  async getMe(): Promise<UserResponse> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      // Auto-create missing profile row if user exists in Supabase Auth
      const defaultName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
      const defaultUsername = user.user_metadata?.username || `user_${user.id.substring(0, 8)}`;
      const { data: newProfile, error: createErr } = await this.supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: defaultName,
          username: defaultUsername,
        })
        .select('*')
        .single();

      if (createErr) throw new Error(createErr.message);
      data = newProfile;
    }

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

  async updateProfile(dto: UpdateUserDto): Promise<UserResponse> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

    if (error) throw new Error(error.message);

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
  async getHabits(includeArchived = false): Promise<HabitResponse[]> {
    const todayStr = new Date().toISOString().split('T')[0];
    const query = this.supabase
      .from('habits')
      .select('*, habit_stats(*), check_ins(id, local_date, status), habit_schedule_days(day_of_week)');

    if (!includeArchived) {
      query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((h: any) => {
      const todayCheckIn = h.check_ins?.find((c: any) => c.local_date === todayStr);
      const completedToday = !!todayCheckIn;
      const todayCheckInId = todayCheckIn?.id || null;
      const daysOfWeek = h.habit_schedule_days?.map((d: any) => d.day_of_week) || [];
      return {
        id: h.id,
        userId: h.profile_id,
        name: h.name,
        description: h.description,
        icon: h.icon,
        status: h.status as HabitStatus,
        scheduleType: h.schedule_type as ScheduleType,
        targetPerWeek: h.target_per_week,
        timezone: h.timezone,
        startDate: h.start_date,
        reminderTime: h.reminder_time,
        completedToday,
        todayCheckInId,
        archivedAt: h.archived_at,
        createdAt: h.created_at,
        daysOfWeek,
        stats: h.habit_stats ? {
          currentStreak: h.habit_stats.current_streak,
          bestStreak: h.habit_stats.best_streak,
          totalCompletions: h.habit_stats.total_completions,
          completionRate: Number(h.habit_stats.completion_rate),
        } : undefined,
        checkIns: h.check_ins?.map((c: any) => ({ id: c.id, localDate: c.local_date, status: c.status || 'COMPLETED' })) || [],
        freezeDaysAvailable: h.freeze_days_available,
        lastFreezeReset: h.last_freeze_reset,
      };
    });
  }

  async createHabit(dto: CreateHabitDto): Promise<HabitResponse> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

    if (error) throw new Error(error.message);

    // 2. Insert schedule days if specific
    if (dto.scheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek) {
      const scheduleDays = dto.daysOfWeek.map((day) => ({
        habit_id: habit.id,
        day_of_week: day,
      }));
      const { error: daysError } = await this.supabase
        .from('habit_schedule_days')
        .insert(scheduleDays);

      if (daysError) throw new Error(daysError.message);
    }

    return {
      id: habit.id,
      userId: habit.profile_id,
      name: habit.name,
      description: habit.description,
      icon: habit.icon,
      status: habit.status as HabitStatus,
      scheduleType: habit.schedule_type as ScheduleType,
      targetPerWeek: habit.target_per_week,
      timezone: habit.timezone,
      startDate: habit.start_date,
      reminderTime: habit.reminder_time,
      archivedAt: habit.archived_at,
      createdAt: habit.created_at,
      freezeDaysAvailable: habit.freeze_days_available || 1,
      lastFreezeReset: habit.last_freeze_reset || habit.created_at,
    };
  }

  async getHabitCheckIns(habitId: string, limit = 14): Promise<CheckInResponse[]> {
    const { data, error } = await this.supabase
      .from('check_ins')
      .select('*')
      .eq('habit_id', habitId)
      .order('local_date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data || []).map((c: any) => ({
      id: c.id,
      userId: c.profile_id,
      habitId: c.habit_id,
      localDate: c.local_date,
      completedAtUtc: c.completed_at_utc,
      timezoneAtCompletion: c.timezone_at_completion,
      source: c.source,
      status: c.status || 'COMPLETED',
    }));
  }

  async deleteHabit(habitId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabase.rpc('delete_habit', {
        p_habit_id: habitId,
      });
      if (error) throw error;
      return { success: true };
    } catch (rpcError) {
      const { error } = await this.supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // Complex Operations via Direct RPC Database Calls
  async checkInHabit(habitId: string, dto: CheckInDto): Promise<{
    checkIn: CheckInResponse;
    stats: { currentStreak: number; bestStreak: number; totalCompletions: number };
    xpAwarded: number;
    levelUp: boolean;
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('complete_habit', {
      p_profile_id: user.id,
      p_habit_id: habitId,
      p_local_date: dto.localDate,
      p_timezone: dto.timezoneAtCompletion,
      p_idempotency_key: dto.idempotencyKey,
    });

    if (error) throw new Error(error.message);

    return {
      checkIn: {
        id: data.checkInId,
        userId: user.id,
        habitId,
        localDate: dto.localDate,
        completedAtUtc: new Date().toISOString(),
        timezoneAtCompletion: dto.timezoneAtCompletion,
        source: 'mobile',
        status: 'COMPLETED',
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

  async undoCheckIn(habitId: string, checkInId: string): Promise<{
    currentStreak: number;
    bestStreak: number;
    totalCompletions: number;
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('undo_complete_habit', {
      p_profile_id: user.id,
      p_habit_id: habitId,
      p_check_in_id: checkInId,
    });

    if (error) throw new Error(error.message);

    return {
      currentStreak: data.currentStreak,
      bestStreak: data.bestStreak,
      totalCompletions: data.totalCompletions,
    };
  }

  async freezeHabit(habitId: string, dto: CheckInDto): Promise<{
    checkIn: CheckInResponse;
    stats: { currentStreak: number; bestStreak: number; totalCompletions: number };
    freezeDaysAvailable: number;
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('freeze_habit', {
      p_profile_id: user.id,
      p_habit_id: habitId,
      p_local_date: dto.localDate,
      p_timezone: dto.timezoneAtCompletion,
      p_idempotency_key: dto.idempotencyKey,
    });

    if (error) throw new Error(error.message);

    return {
      checkIn: {
        id: data.checkInId,
        userId: user.id,
        habitId,
        localDate: dto.localDate,
        completedAtUtc: new Date().toISOString(),
        timezoneAtCompletion: dto.timezoneAtCompletion,
        source: 'mobile',
        status: 'FREEZE',
      },
      stats: {
        currentStreak: data.stats.currentStreak,
        bestStreak: data.stats.bestStreak,
        totalCompletions: data.stats.totalCompletions,
      },
      freezeDaysAvailable: data.freezeDaysAvailable,
    };
  }

  async undoFreeze(habitId: string, checkInId: string): Promise<{
    stats: { currentStreak: number; bestStreak: number; totalCompletions: number };
    freezeDaysAvailable: number;
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('undo_freeze_habit', {
      p_profile_id: user.id,
      p_habit_id: habitId,
      p_check_in_id: checkInId,
    });

    if (error) throw new Error(error.message);

    return {
      stats: {
        currentStreak: data.stats.currentStreak,
        bestStreak: data.stats.bestStreak,
        totalCompletions: data.stats.totalCompletions,
      },
      freezeDaysAvailable: data.freezeDaysAvailable,
    };
  }

  // Rooms CRUD and RPCs
  async getRooms(): Promise<RoomResponse[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch active room memberships for current user
    const { data: memberRows, error: memErr } = await this.supabase
      .from('room_members')
      .select('room_id')
      .eq('profile_id', user.id)
      .is('left_at', null);

    if (memErr) throw new Error(memErr.message);

    const roomIds = (memberRows || []).map((m: any) => m.room_id);
    if (roomIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('rooms')
      .select('*, room_members(count)')
      .in('id', roomIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      name: r.name,
      description: r.description,
      imagePath: r.image_url,
      visibility: r.visibility as RoomVisibility,
      inviteCode: r.invite_code,
      memberCount: r.room_members?.[0]?.count || 0,
      activeTodayCount: 0,
      durationType: r.duration_type || 'PERMANENT',
      durationDays: r.duration_days,
      expiresAt: r.expires_at,
    }));
  }

  async createRoom(dto: CreateRoomDto): Promise<RoomResponse> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('create_room', {
      p_owner_id: user.id,
      p_name: dto.name,
      p_description: dto.description || null,
      p_visibility: dto.visibility,
      p_duration_type: dto.durationType || 'PERMANENT',
      p_duration_days: dto.durationDays || null,
    });

    if (error) throw new Error(error.message);

    // Save initial tracked habits for room
    if (dto.trackedHabits && dto.trackedHabits.length > 0) {
      for (const th of dto.trackedHabits) {
        await this.supabase.from('room_habits').insert({
          room_id: data.roomId,
          name: th.name,
          description: th.description || null,
        });
      }
    }

    // Send invitations to pre-invited members (excluding room owner)
    if (dto.invitedUserIds && dto.invitedUserIds.length > 0) {
      for (const inviteeId of dto.invitedUserIds) {
        if (inviteeId === user.id) continue;
        try {
          await this.sendRoomInvitation(data.roomId, inviteeId);
        } catch (invErr) {
          console.warn('Failed to send room invitation during creation:', invErr);
        }
      }
    }

    return {
      id: data.roomId,
      ownerId: user.id,
      name: data.name,
      description: dto.description,
      visibility: dto.visibility as RoomVisibility,
      inviteCode: data.inviteCode,
      memberCount: 1,
      activeTodayCount: 0,
      durationType: data.durationType,
      durationDays: data.durationDays,
      expiresAt: data.expiresAt,
    };
  }

  async joinRoom(dto: JoinRoomDto): Promise<RoomResponse & { requestSent?: boolean; roomName?: string }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const cleanCode = dto.inviteCode.trim().toUpperCase();

    const { data, error } = await this.supabase.rpc('join_room_by_code', {
      p_invite_code: cleanCode,
    });

    if (error) throw new Error(error.message);

    return {
      id: data.roomId || '',
      ownerId: '',
      name: data.roomName || '',
      description: undefined,
      visibility: 'PUBLIC' as RoomVisibility,
      inviteCode: cleanCode,
      memberCount: data.joined ? 1 : 0,
      activeTodayCount: 0,
      requestSent: !!data.requestSent,
      roomName: data.roomName,
    };
  }

  async leaveRoom(roomId: string): Promise<{ success: boolean }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('leave_room', {
      p_profile_id: user.id,
      p_room_id: roomId,
    });

    if (error) throw new Error(error.message);
    return { success: data };
  }

  async getRoomDetails(roomId: string): Promise<RoomResponse & {
    roomHabits: Array<{ id: string; name: string; description: string | null }>;
    members: Array<{ id: string; role: string; user: UserResponse }>;
  }> {
    // 1. Fetch Room info
    const { data: room, error: roomErr } = await this.supabase
      .from('rooms')
      .select('*, room_members(*, profiles(*)), room_habits(*)')
      .eq('id', roomId)
      .single();

    if (roomErr) throw new Error(roomErr.message);

    const members = (room.room_members || [])
      .filter((m: any) => !m.left_at)
      .map((m: any) => ({
        id: m.id,
        role: m.role,
        user: {
          id: m.profiles?.id || m.profile_id,
          displayName: m.profiles?.display_name || 'Member',
          username: m.profiles?.username || 'user',
          avatarPath: m.profiles?.avatar_url,
          bio: m.profiles?.bio,
          timezone: m.profiles?.timezone || 'UTC',
          xp: m.profiles?.xp || 0,
          level: m.profiles?.level || 1,
          created_at: m.profiles?.created_at,
        },
      }));

    const roomHabits = (room.room_habits || []).filter((h: any) => !h.archived_at).map((h: any) => ({
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
      visibility: room.visibility as RoomVisibility,
      inviteCode: room.invite_code,
      memberCount: members.length,
      activeTodayCount: 0,
      durationType: room.duration_type || 'PERMANENT',
      durationDays: room.duration_days,
      expiresAt: room.expires_at,
      roomHabits,
      members,
    };
  }

  async extendRoomDuration(roomId: string, additionalDays: number): Promise<any> {
    const { data, error } = await this.supabase.rpc('extend_room_duration', {
      p_room_id: roomId,
      p_additional_days: additionalDays,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async createRoomHabit(roomId: string, name: string, description?: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('room_habits')
      .insert({
        room_id: roomId,
        name,
        description,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async archiveRoomHabit(roomId: string, roomHabitId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('room_habits')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('id', roomHabitId)
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async linkPersonalHabit(roomId: string, roomHabitId: string, personalHabitId: string): Promise<any> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: member, error: memberErr } = await this.supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('profile_id', user.id)
      .is('left_at', null)
      .single();

    if (memberErr) throw new Error('Not a member of the room');

    const { data, error } = await this.supabase
      .from('room_habit_links')
      .insert({
        room_member_id: member.id,
        room_habit_id: roomHabitId,
        personal_habit_id: personalHabitId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async unlinkPersonalHabit(roomId: string, roomHabitId: string): Promise<any> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: member, error: memberErr } = await this.supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('profile_id', user.id)
      .is('left_at', null)
      .single();

    if (memberErr) throw new Error('Not a member of the room');

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

    if (error) throw new Error(error.message);
    return data;
  }

  async getRoomActivity(roomId: string): Promise<any[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('activities')
      .select('*, profiles(display_name, avatar_url), room_activity_reactions(reaction_type, profile_id)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true }); // Oldest first for chat feed

    if (error) throw new Error(error.message);

    return (data || []).map((a: any) => {
      const reactionsMap: Record<string, { count: number; active: boolean }> = {
        heart: { count: 0, active: false },
        fire: { count: 0, active: false },
        thumb: { count: 0, active: false },
      };

      (a.room_activity_reactions || []).forEach((r: any) => {
        const type = r.reaction_type;
        if (reactionsMap[type]) {
          reactionsMap[type].count += 1;
          if (r.profile_id === user.id) {
            reactionsMap[type].active = true;
          }
        }
      });

      return {
        id: a.id,
        actorUserId: a.actor_profile_id,
        actorDisplayName: a.profiles?.display_name || 'Member',
        actorAvatarPath: a.profiles?.avatar_url,
        roomId: a.room_id,
        type: a.type,
        message: a.message,
        metadata_json: a.metadata_json,
        createdAt: a.created_at,
        isOwn: a.actor_profile_id === user.id,
        reactions: reactionsMap,
      };
    });
  }

  async toggleActivityReaction(activityId: string, reactionType: string): Promise<any> {
    const { data, error } = await this.supabase.rpc('toggle_activity_reaction', {
      p_activity_id: activityId,
      p_reaction_type: reactionType,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async getRoomMembers(roomId: string): Promise<Array<{
    profileId: string;
    displayName: string;
    username: string;
    role: string;
    joinedAt: string;
    isYou: boolean;
  }>> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('room_members')
      .select('profile_id, role, joined_at, profiles(display_name, username)')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((m: any) => ({
      profileId: m.profile_id,
      displayName: m.profiles?.display_name || 'Member',
      username: m.profiles?.username || 'user',
      role: m.role,
      joinedAt: m.joined_at,
      isYou: m.profile_id === user.id,
    }));
  }

  async getRoomLeaderboard(roomId: string, period = 'weekly'): Promise<Array<{
    userId: string;
    displayName: string;
    avatarPath?: string;
    score: number;
    rank: number;
  }>> {
    const { data, error } = await this.supabase.rpc('get_leaderboard', {
      p_room_id: roomId,
      p_period: period,
    });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      userId: row.profile_id,
      displayName: row.display_name,
      avatarPath: row.avatar_url,
      score: Number(row.score),
      rank: row.rank,
    }));
  }

  async reactToActivity(activityId: string, type: string): Promise<{ success: boolean; reacted: boolean }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing, error: checkError } = await this.supabase
      .from('reactions')
      .select('id')
      .eq('activity_id', activityId)
      .eq('profile_id', user.id)
      .eq('type', type)
      .maybeSingle();

    if (checkError) throw new Error(checkError.message);

    if (existing) {
      const { error: delError } = await this.supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id);

      if (delError) throw new Error(delError.message);
      return { success: true, reacted: false };
    } else {
      const { error: insError } = await this.supabase
        .from('reactions')
        .insert({
          activity_id: activityId,
          profile_id: user.id,
          type,
        });

      if (insError) throw new Error(insError.message);
      return { success: true, reacted: true };
    }
  }

  async deleteAccount(): Promise<{ success: boolean }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.rpc('delete_account', {
      p_profile_id: user.id,
    });

    if (error) throw new Error(error.message);
    return { success: data };
  }

  async forgotPassword(email: string, redirectTo?: string): Promise<{ success: boolean }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  }

  async resetPassword(newPassword: string): Promise<{ success: boolean }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  }

  async getReflectionForDate(localDate: string): Promise<ReflectionResponse | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('reflections')
      .select('*')
      .eq('profile_id', user.id)
      .eq('local_date', localDate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

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

  async submitReflection(dto: CreateReflectionDto): Promise<ReflectionResponse> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

    if (error) throw new Error(error.message);

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

  // Update Habit Icon or details
  async updateHabitIcon(habitId: string, iconName: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('habits')
      .update({ icon: iconName, updated_at: new Date().toISOString() })
      .eq('id', habitId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateHabit(habitId: string, dto: any): Promise<any> {
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.icon !== undefined) updatePayload.icon = dto.icon;
    if (dto.scheduleType !== undefined) updatePayload.schedule_type = dto.scheduleType;
    if (dto.reminderTime !== undefined) updatePayload.reminder_time = dto.reminderTime;

    const { data, error } = await this.supabase
      .from('habits')
      .update(updatePayload)
      .eq('id', habitId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update habit schedule days if scheduleType or daysOfWeek is provided
    if (dto.scheduleType !== undefined || dto.daysOfWeek !== undefined) {
      // Delete existing schedule days for this habit
      const { error: deleteErr } = await this.supabase
        .from('habit_schedule_days')
        .delete()
        .eq('habit_id', habitId);

      if (deleteErr) throw new Error(deleteErr.message);

      // Insert new schedule days if SPECIFIC_DAYS
      const targetScheduleType = dto.scheduleType || data.schedule_type;
      if (targetScheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek && dto.daysOfWeek.length > 0) {
        const scheduleDays = dto.daysOfWeek.map((day: number) => ({
          habit_id: habitId,
          day_of_week: day,
        }));
        const { error: insertErr } = await this.supabase
          .from('habit_schedule_days')
          .insert(scheduleDays);

        if (insertErr) throw new Error(insertErr.message);
      }
    }

    return data;
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean }> {
    const { error } = await this.supabase
      .from('rooms')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', roomId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  // In-App Notifications & Room Invitations
  async getNotifications(): Promise<any[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('in_app_notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('In-app notifications table might not exist yet:', error.message);
      return [];
    }

    return data || [];
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw new Error(error.message);
    return true;
  }

  async markAllNotificationsRead(): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('profile_id', user.id);

    if (error) throw new Error(error.message);
    return true;
  }

  async respondToInvitation(invitationId: string, accept: boolean): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('respond_to_invitation', {
      p_invitation_id: invitationId,
      p_accept: accept,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Search users by username (for Option A: direct invite)
  async searchUsersByUsername(query: string): Promise<Array<{ id: string; displayName: string; username: string; avatarPath?: string }>> {
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.replace('@', '').trim().toLowerCase();
    const { data: { user } } = await this.supabase.auth.getUser();

    let queryBuilder = this.supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .ilike('username', `${cleanQuery}%`);

    if (user) {
      queryBuilder = queryBuilder.neq('id', user.id);
    }

    const { data, error } = await queryBuilder.limit(10);

    if (error) {
      console.warn('User search error:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      displayName: p.display_name,
      username: p.username,
      avatarPath: p.avatar_url,
    }));
  }

  // Send direct room invitation (Option A)
  async sendRoomInvitation(roomId: string, inviteeId: string): Promise<{ invitationId: string; success: boolean }> {
    const { data, error } = await this.supabase.rpc('send_room_invitation', {
      p_room_id: roomId,
      p_invitee_id: inviteeId,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Get invitation details including room ID & tracked habits for habit matching (Option 1)
  async getInvitationDetails(invitationId: string): Promise<{
    invitationId: string;
    roomId: string;
    roomName: string;
    inviterName: string;
    type: string;
    status: string;
    trackedHabits: Array<{ id: string; name: string; description: string | null }>;
  }> {
    const { data, error } = await this.supabase.rpc('get_invitation_details', {
      p_invitation_id: invitationId,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Get room info by invite code including tracked habits for pre-join matching
  async getRoomByInviteCode(inviteCode: string): Promise<{
    roomId: string;
    roomName: string;
    description: string | null;
    visibility: string;
    inviteCode: string;
    trackedHabits: Array<{ id: string; name: string; description: string | null }>;
  }> {
    const { data, error } = await this.supabase.rpc('get_room_by_invite_code', {
      p_invite_code: inviteCode.trim().toUpperCase(),
    });

    if (error) throw new Error(error.message);
    return data;
  }
}

