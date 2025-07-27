"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { DollarSign, TrendingUp, Users, CreditCard, Download } from "lucide-react"

interface Props {
  adminUser: any
}

interface BillingData {
  totalRevenue: number
  monthlyRevenue: number
  averageRevenuePerUser: number
  totalTransactions: number
  revenueGrowth: number
}

interface Transaction {
  id: string
  userId: string
  userEmail: string
  amount: number
  type: "subscription" | "usage" | "credit"
  status: "completed" | "pending" | "failed"
  date: string
  description: string
}

export function BillingManagement({ adminUser }: Props) {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBillingData()
    fetchTransactions()
  }, [])

  const fetchBillingData = async () => {
    try {
      const response = await fetch("/api/admin/billing/overview")
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/admin/billing/transactions")
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  // Mock data for demonstration
  const mockBillingData: BillingData = {
    totalRevenue: 45280.5,
    monthlyRevenue: 8420.75,
    averageRevenuePerUser: 36.25,
    totalTransactions: 1247,
    revenueGrowth: 18.5,
  }

  const mockTransactions: Transaction[] = [
    {
      id: "txn_001",
      userId: "user123",
      userEmail: "john.doe@example.com",
      amount: 29.99,
      type: "subscription",
      status: "completed",
      date: "2025-01-27T10:30:00Z",
      description: "Monthly Pro subscription",
    },
    {
      id: "txn_002",
      userId: "user456",
      userEmail: "jane.smith@example.com",
      amount: 15.5,
      type: "usage",
      status: "completed",
      date: "2025-01-27T09:15:00Z",
      description: "Additional token usage",
    },
    {
      id: "txn_003",
      userId: "user789",
      userEmail: "bob.wilson@example.com",
      amount: 50.0,
      type: "credit",
      status: "pending",
      date: "2025-01-27T08:45:00Z",
      description: "Account credit purchase",
    },
  ]

  const revenueData = [
    { month: "Jan", revenue: 3200, users: 120 },
    { month: "Feb", revenue: 4100, users: 145 },
    { month: "Mar", revenue: 5200, users: 167 },
    { month: "Apr", revenue: 6800, users: 189 },
    { month: "May", revenue: 7500, users: 234 },
    { month: "Jun", revenue: 8420, users: 278 },
  ]

  const currentBillingData = billingData || mockBillingData
  const currentTransactions = transactions.length > 0 ? transactions : mockTransactions

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "secondary",
      pending: "outline",
      failed: "destructive",
    }
    const colors = {
      completed: "text-green-600 bg-green-50",
      pending: "text-yellow-600 bg-yellow-50",
      failed: "text-red-600 bg-red-50",
    }
    return { variant: variants[status as keyof typeof variants], className: colors[status as keyof typeof colors] }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Billing Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor revenue, transactions, and billing analytics</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentBillingData.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />+{currentBillingData.revenueGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentBillingData.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue per User</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentBillingData.averageRevenuePerUser}</div>
            <p className="text-xs text-muted-foreground">Per user per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBillingData.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTransactions.map((transaction) => {
                    const statusBadge = getStatusBadge(transaction.status)
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{transaction.userEmail}</div>
                            <div className="text-gray-500 font-mono text-xs">{transaction.userId}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">${transaction.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant as any} className={statusBadge.className}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
