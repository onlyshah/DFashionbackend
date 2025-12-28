module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Brand', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT }
  }, { tableName: 'brands', timestamps: true });
};
