module.exports = {
  REDIS: {
    CMD: 'parkfinderCommands',
    STATS: 'parkfinderStats',
    SENSOR_PUB: 'parkfinderSensorUpdate'
  },

  ACTIONS: {
    RESERVE: 'reserveSlot',
    OCCUPY: 'occupySlot',
    LEAVE: 'leaveSlot',
    CANCEL: 'cancelSlot',
    ALERT: 'alertSlot',
    MAINTENANCE: 'maintenanceSlot'
  }
};