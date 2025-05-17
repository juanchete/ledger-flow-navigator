import { supabase } from "./client";

/**
 * Servicio para manejar la sincronización entre Supabase Auth y la tabla personalizada de usuarios
 */
export const userService = {
  /**
   * Obtiene el perfil de usuario actual desde la tabla 'users'
   */
  async getCurrentUserProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  },

  /**
   * Crea o actualiza el perfil de usuario en la tabla 'users'
   */
  async upsertUserProfile(
    userId: string,
    userData: {
      email: string;
      full_name?: string;
      avatar_url?: string;
      role?: string;
    }
  ) {
    const { data, error } = await supabase.from("users").upsert(
      {
        id: userId,
        email: userData.email,
        full_name: userData.full_name || null,
        avatar_url: userData.avatar_url || null,
        role: userData.role || "user",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Error creating/updating user profile:", error);
      return false;
    }

    return true;
  },

  /**
   * Crea el perfil de usuario en la tabla 'users' después de un registro exitoso
   */
  async createUserProfileAfterSignUp(userId: string, email: string) {
    return this.upsertUserProfile(userId, {
      email,
      role: "user", // Role por defecto
    });
  },

  /**
   * Actualiza el rol de un usuario
   */
  async updateUserRole(userId: string, role: string) {
    const { error } = await supabase
      .from("users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user role:", error);
      return false;
    }

    return true;
  },

  /**
   * Verifica si el usuario actual tiene el rol especificado
   */
  async hasRole(role: string) {
    const userProfile = await this.getCurrentUserProfile();
    return userProfile?.role === role;
  },

  /**
   * Obtiene el ID del usuario actual
   */
  async getCurrentUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  },
};
