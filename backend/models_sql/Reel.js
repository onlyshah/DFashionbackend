module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Reel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER },
    videoUrl: { type: DataTypes.STRING(1000) }
  }, { tableName: 'reels', timestamps: true });
};
