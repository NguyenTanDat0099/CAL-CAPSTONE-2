export const getAdminProfileService = () => {
  return {
    id: 101,
    name: 'Admin CalAI',
    email: 'admin@calai.com',
    role: 'admin',
  };
};

export const getAdminStatsService = () => {
  return {
    totalUsers: 120,
    activeUsers: 95,
    mealsLoggedToday: 340,
    systemStatus: 'running',
  };
};

export const getAllUsersService = () => {
  return [
    {
      id: 1,
      name: 'Nguyen Tan Dat',
      email: 'tandat@example.com',
      role: 'user',
      status: 'active',
    },
    {
      id: 2,
      name: 'Tran Minh Quan',
      email: 'quan@example.com',
      role: 'user',
      status: 'inactive',
    },
    {
      id: 3,
      name: 'Le Thu Ha',
      email: 'ha@example.com',
      role: 'user',
      status: 'active',
    },
  ];
};
