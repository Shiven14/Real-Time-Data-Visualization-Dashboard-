import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale } from 'chart.js';
import io from 'socket.io-client';

ChartJS.register(LineElement, CategoryScale, LinearScale);

const socket = io('http://localhost:5000');

const Dashboard = () => {
  const [data, setData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Sample Data',
        data: [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  });

  useEffect(() => {
    socket.on('data', newData => {
      setData(prevData => ({
        ...prevData,
        labels: [...prevData.labels, new Date().toLocaleTimeString()],
        datasets: [
          {
            ...prevData.datasets[0],
            data: [...prevData.datasets[0].data, newData.value]
          }
        ]
      }));
    });
  }, []);

  return (
    <div>
      <h1>Real-Time Data Visualization Dashboard</h1>
      <Line data={data} />
    </div>
  );
};

export default Dashboard;
