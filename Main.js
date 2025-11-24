import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function Main() {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('All');

  // Create table on startup
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

  // 2. Load Expenses (Replaces loadTasks)
  const loadExpenses = async () => {
    const rows = await db.getAllAsync("SELECT * FROM expenses ORDER BY id DESC");
    setExpenses(rows);
  };

  // 3. Add Expense (Replaces addTask)
  const addExpense = async () => {
    // Basic validation
    if (!amount || !category) return;

    const newDate = new Date().toISOString(); // Generate "2025-11-23..."

    await db.runAsync(
      "INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)",
      [parseFloat(amount), category, note, newDate]
    );
    
    // Clear inputs and reload
    setAmount("");
    setCategory("");
    setNote("");
    loadExpenses();
  };

  const deleteTask = async (id) => {
    await db.runAsync(
      "DELETE FROM tasks WHERE id = ?;",
      [id]
    );

    loadTasks();
  };

  const renderItem = ({ item }) => (
    <View style={styles.taskRow}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => toggleTask(item.id, item.done)}
      >
        <Text style={[styles.taskText, item.done ? styles.done : null]}>
          {item.title}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => deleteTask(item.id)}>
        <Text style={styles.delete}>🤮</Text>
      </TouchableOpacity>
    </View>
  );


// Helper: Filter expenses by date
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


// Calculate Totals
  const calculateTotals = () => {
    // 1. Sum up all amounts
    const total = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);

    // 2. Group by Category
    const byCategory = visibleExpenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

    return { total, byCategory };
  };

  const { total, byCategory } = calculateTotals();  


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
        <TouchableOpacity style={styles.addButton} onPress={addExpense}>
          <Text style={styles.addButtonText}>Add Expense</Text>
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

      {/* SUMMARY SECTION */}
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

      {/* 3. EXPENSE LIST */}
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
          </View>
        )}
      />
    </SafeAreaView>
  );

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
});

// Add inside StyleSheet.create({ ... })
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