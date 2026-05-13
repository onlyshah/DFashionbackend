module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'display_name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isSystemRole: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_system_role'
    }
  }, {
    tableName: 'roles',
    timestamps: true
  });

  return Role;
};
