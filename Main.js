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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Expo + SQLite Task List</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="New task..."
          placeholderTextColor="#9ca3af"
          value={input}
          onChangeText={setInput}
        />
        <Button title="Add" onPress={addTask} />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={t => t.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No tasks yet.</Text>}
      />

      <Text style={styles.footer}>Tap to toggle • Tap ✕ to delete</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#111827" },
  heading: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 16 },
  row: { flexDirection: "row", marginBottom: 16, gap: 8 },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: "#1f2937",
    color: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2937",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskText: { fontSize: 16, color: "#e5e7eb" },
  done: { color: "#9ca3af", textDecorationLine: "line-through" },
  delete: { color: "#f87171", fontSize: 18, marginLeft: 12 },
  empty: { color: "#9ca3af", marginTop: 24, textAlign: "center" },
  footer: { textAlign: "center", color: "#6b7280", marginTop: 12, fontSize: 12 },
});