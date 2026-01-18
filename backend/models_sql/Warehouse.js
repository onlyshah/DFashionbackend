module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Warehouse', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    name: { 
      type: DataTypes.STRING(150), 
      allowNull: false,
      unique: true
    },
    location: { 
      type: DataTypes.STRING(255), 
      allowNull: false 
    },
    address: { 
      type: DataTypes.TEXT 
    },
    city: { 
      type: DataTypes.STRING(100) 
    },
    state: { 
      type: DataTypes.STRING(100) 
    },
    zipCode: { 
      type: DataTypes.STRING(20) 
    },
    country: { 
      type: DataTypes.STRING(100) 
    },
    capacity: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    manager: { 
      type: DataTypes.STRING(150) 
    },
    phone: { 
      type: DataTypes.STRING(20) 
    },
    email: { 
      type: DataTypes.STRING(150) 
    },
    status: { 
      type: DataTypes.ENUM('active', 'inactive'), 
      defaultValue: 'active' 
    }
  }, { 
    tableName: 'warehouses', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
