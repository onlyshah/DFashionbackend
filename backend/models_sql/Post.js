module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Post', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING(300) },
    content: { type: DataTypes.TEXT }
  }, { tableName: 'posts', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
