class RoomRepository {
  constructor({ supabase, db }) {
    this.supabase = supabase;
    this.db = db;
  }

  async findById(roomId) {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from("rooms")
        .select("id,gm_token,invite_token,state,created_at")
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return this.db.prepare("SELECT id, gm_token, invite_token, state, created_at FROM rooms WHERE id = ?").get(roomId) || null;
  }

  async insert(room) {
    if (this.supabase) {
      const { error } = await this.supabase.from("rooms").insert({
        id: room.id,
        gm_token: room.gmToken,
        invite_token: room.inviteToken,
        state: room.state,
        created_at: new Date(room.createdAt).toISOString(),
      });
      if (error) throw error;
      return;
    }
    this.db.prepare("INSERT INTO rooms (id, gm_token, invite_token, state, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(room.id, room.gmToken, room.inviteToken, JSON.stringify(room.state), room.createdAt);
  }

  async updateState(roomId, state) {
    if (this.supabase) {
      const { error } = await this.supabase.from("rooms").update({ state }).eq("id", roomId);
      if (error) throw error;
      return;
    }
    this.db.prepare("UPDATE rooms SET state = ? WHERE id = ?").run(JSON.stringify(state), roomId);
  }
}

module.exports = { RoomRepository };