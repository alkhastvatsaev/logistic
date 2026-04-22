import { useState, useEffect } from 'react';
import { rtdb, rtdbRef, onValue } from '@/lib/firebase';

export function useAllRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(rtdbRef(rtdb, "requests"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data)
          .map(k => ({ ...data[k], id: k }))
          .sort((a,b) => b.createdAt - a.createdAt);
        setRequests(list);
      } else {
        setRequests([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { requests, loading };
}

export function useAllQuotes() {
  const [quotes, setQuotes] = useState<any>({});

  useEffect(() => {
    const unsub = onValue(rtdbRef(rtdb, "quotes"), (snap) => {
      setQuotes(snap.val() || {});
    });
    return () => unsub();
  }, []);

  return quotes;
}

export function useRequestDetail(id: string) {
  const [request, setRequest] = useState<any | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubReq = onValue(rtdbRef(rtdb, `requests/${id}`), (snap) => {
      const data = snap.val();
      if (data) {
        setRequest({ id, ...data });
      }
      setLoading(false);
    });

    const unsubQuotes = onValue(rtdbRef(rtdb, `quotes/${id}`), (snap) => {
      const data = snap.val();
      if (data) {
        setQuotes(Object.keys(data).map(k => ({ ...data[k], id: k })));
      } else {
        setQuotes([]);
      }
    });

    const unsubPay = onValue(rtdbRef(rtdb, `payments/${id}`), (snap) => {
      const data = snap.val();
      if (data) {
        setPayments(Object.keys(data).map(k => ({ ...data[k], id: k })));
      } else {
        setPayments([]);
      }
    });

    return () => {
      unsubReq();
      unsubQuotes();
      unsubPay();
    };
  }, [id]);

  return { request, quotes, payments, loading };
}
