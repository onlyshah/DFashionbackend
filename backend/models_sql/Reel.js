module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Reel', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID },
    videoUrl: { type: DataTypes.STRING(1000) }
  }, { tableName: 'reels', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
