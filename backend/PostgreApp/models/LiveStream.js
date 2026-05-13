module.exports = (sequelize, DataTypes) => {
  return sequelize.define('LiveStream', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    hostId: { type: DataTypes.UUID, allowNull: false },
    streamUrl: { type: DataTypes.STRING(500) },
    status: { type: DataTypes.ENUM('scheduled', 'live', 'ended'), defaultValue: 'scheduled' },
    startTime: { type: DataTypes.DATE },
    endTime: { type: DataTypes.DATE },
    viewers: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, { tableName: 'live_streams', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
