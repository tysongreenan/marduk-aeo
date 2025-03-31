import { Box, Heading } from '@chakra-ui/react'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import { UsageTrendsData } from '../types'

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

interface Props {
    data: UsageTrendsData | undefined;
}

export default function UsageTrends({ data }: Props) {
    if (!data) {
        return <Box>Loading usage trends...</Box>
    }

    const chartData = {
        labels: ['Daily', 'Weekly', 'Monthly'],
        datasets: [
            {
                label: 'Usage %',
                data: [data.daily_usage, data.weekly_usage, data.monthly_usage],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }
        ]
    }

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Usage Trends'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: 'Usage %'
                }
            }
        }
    }

    return (
        <Box>
            <Heading size="md" mb={4}>Usage Trends</Heading>
            <Line data={chartData} options={options} />
        </Box>
    )
} 