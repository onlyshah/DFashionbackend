module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(300) },
    content: { type: DataTypes.TEXT }
  }, { tableName: 'posts', timestamps: true });
};
