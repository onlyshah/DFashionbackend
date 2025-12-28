module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Story', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    mediaUrl: { type: DataTypes.STRING(1000) }
  }, { tableName: 'stories', timestamps: true });
};
