module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InventoryHistory', {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      defaultValue: DataTypes.UUIDV4 
    },
    transactionId: { 
      type: DataTypes.STRING(100), 
      allowNull: false,
      unique: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    type: { 
      type: DataTypes.ENUM('in', 'out', 'adjustment', 'receipt', 'sale', 'return', 'damage', 'expired'), 
      allowNull: false 
    },
    quantity: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'CASCADE'
    },
    reference: { 
      type: DataTypes.INTEGER,
      allowNull: true
    },
    referenceType: { 
      type: DataTypes.ENUM('Order', 'Purchase', 'Return'), 
      defaultValue: 'Purchase' 
    },
    userId: { 
      type: DataTypes.UUID, 
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    notes: { 
      type: DataTypes.TEXT 
    },
    timestamp: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, { 
    tableName: 'inventory_histories', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
