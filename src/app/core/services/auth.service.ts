import api from './api.service';

class AuthService {
  async login(email: string, password: string) {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.token) {
        // Guardar el token y los datos del usuario en el almacenamiento local
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Error en el login:', error);
      throw error;
    }
  }

  logout() {
    // Eliminar el token y los datos del usuario
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  getAuthHeader() {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }
}

export default new AuthService();
