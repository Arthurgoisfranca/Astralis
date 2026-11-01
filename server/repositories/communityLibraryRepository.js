class CommunityLibraryRepository {
  constructor({ supabase, db }) {
    this.supabase = supabase;
    this.db = db;
  }

  async list(limit = 300) {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from("community_library")
        .select("id,title,system,uploader,bucket,file_path,file_name,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }
    return this.db.prepare("SELECT id,title,system,uploader,bucket,file_path,file_name,created_at FROM community_files ORDER BY created_at DESC LIMIT ?").all(limit);
  }

  async insert(item) {
    if (this.supabase) {
      const { error } = await this.supabase.from("community_library").insert(item);
      if (error) throw error;
      return;
    }
    this.db.prepare("INSERT INTO community_files (id,title,system,uploader,bucket,file_path,file_name,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(item.id, item.title, item.system, item.uploader, item.bucket, item.file_path, item.file_name, Date.parse(item.created_at) || Date.now());
  }
}

module.exports = { CommunityLibraryRepository };