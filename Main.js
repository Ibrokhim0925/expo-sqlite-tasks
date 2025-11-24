import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function Main() {
  const db = useSQLiteContext();
  
  // --- STATE ---
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null); // Track which ID is being edited

  // --- DATABASE SETUP & LOADING ---
  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL,
          category TEXT,
          note TEXT,
          date TEXT NOT NULL
        );
      `);
      loadExpenses(); // Fetch data after table is created
    }
    setup();
  }, []);

  const loadExpenses = async () => {
    const rows = await db.getAllAsync("SELECT * FROM expenses ORDER BY id DESC");
    setExpenses(rows);
  };

  // --- ADD / UPDATE LOGIC ---
  const saveExpense = async () => {
    if (!amount || !category) return;

    if (editingId) {
      // 1. UPDATE existing record
      await db.runAsync(
        "UPDATE expenses SET amount = ?, category = ?, note = ? WHERE id = ?",
        [parseFloat(amount), category, note, editingId]
      );
      setEditingId(null); // Exit edit mode
    } else {
      // 2. INSERT new record
      const newDate = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)",
        [parseFloat(amount), category, note, newDate]
      );
    }

    // 3. Reset form and reload
    setAmount("");
    setCategory("");
    setNote("");
    loadExpenses();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setNote(item.note);
  };

  // --- FILTER & ANALYTICS ---
  const getFilteredExpenses = () => {
    if (filter === 'All') return expenses;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter((ex) => {
      const exDate = new Date(ex.date);
      if (filter === 'Week') return exDate >= startOfWeek;
      if (filter === 'Month') return exDate >= startOfMonth;
      return true;
    });
  };

  const visibleExpenses = getFilteredExpenses();

  const calculateTotals = () => {
    const total = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);

    const byCategory = visibleExpenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

    return { total, byCategory };
  };

  const { total, byCategory } = calculateTotals();

  // --- RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      {/* 1. INPUT FORM */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Amount ($)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        
        {/* Updated Button to use saveExpense */}
        <TouchableOpacity style={styles.addButton} onPress={saveExpense}>
          <Text style={styles.addButtonText}>
            {editingId ? "Update Expense" : "Add Expense"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. FILTER BUTTONS */}
      <View style={styles.filterContainer}>
        {['All', 'Week', 'Month'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.activeFilter]}
            onPress={() => setFilter(f)}
          >
            <Text style={styles.filterText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. SUMMARY SECTION */}
      <View style={styles.summaryContainer}>
        <Text style={styles.totalText}>Total Spending: ${total.toFixed(2)}</Text>
        
        <View style={styles.categoryList}>
          {Object.keys(byCategory).map((cat) => (
            <Text key={cat} style={styles.categoryStat}>
              {cat}: ${byCategory[cat].toFixed(2)}
            </Text>
          ))}
        </View>
      </View>

      {/* 4. EXPENSE LIST */}
      <FlatList
        data={visibleExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
            </View>
            <Text style={styles.note}>{item.note}</Text>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
            
            {/* EDIT BUTTON */}
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// --- STYLES (Merged into one object) ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#111827" },
  heading: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 16, textAlign: 'center' },
  
  // Input Styles
  inputContainer: { gap: 10, marginBottom: 20 },
  input: {
    backgroundColor: "#1f2937",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  addButton: { backgroundColor: "#3b82f6", padding: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: "#fff", fontWeight: "bold" },

  // Filter Styles
  filterContainer: { flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" },
  filterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#374151" },
  activeFilter: { backgroundColor: "#10b981" },
  filterText: { color: "#fff", fontSize: 14 },

  // Summary Styles
  summaryContainer: {
    backgroundColor: "#374151",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  totalText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  categoryStat: {
    color: "#9ca3af",
    fontSize: 14,
    backgroundColor: "#1f2937",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  // Card Styles
  card: {
    backgroundColor: "#1f2937",
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  category: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  amount: { color: "#4ade80", fontSize: 16, fontWeight: "bold" },
  note: { color: "#9ca3af", fontSize: 14 },
  date: { color: "#6b7280", fontSize: 12, marginTop: 4, textAlign: 'right' },
  editText: {
    color: "#3b82f6",
    marginTop: 8,
    fontWeight: "bold",
  },
});