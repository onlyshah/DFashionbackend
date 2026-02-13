module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Story', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: true },
    mediaUrl: { type: DataTypes.STRING(1000) }
  }, { tableName: 'stories', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
