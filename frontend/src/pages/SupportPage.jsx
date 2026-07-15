import React from 'react';
import { Mail, Phone, MessageCircle, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SupportPage = () => {
  const officialEmail = 'connecthub387@gmail.com';
  const officialPhone = '0748459757';

  // Format WhatsApp Link: 254 country code for Kenya
  const whatsappUrl = 'https://wa.me/254748459757';

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Friendly support message / header */}
        <div className="text-center mb-12">
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full tracking-wide uppercase">
            Support Desk
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 mt-3 tracking-tight">
            How can we help you today?
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 mt-3 max-w-xl mx-auto leading-relaxed">
            Our team is dedicated to providing you with the best experience possible. Feel free to reach out through any of our channels below.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Email Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-neutral-800 text-lg">Email Us</h3>
              <p className="text-xs text-neutral-500 mt-1">Get support with any operational, technical, or payment issues.</p>
              <a
                href={`mailto:${officialEmail}`}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 mt-4 break-all block px-2 py-1 rounded hover:bg-blue-50 transition-colors"
              >
                {officialEmail}
              </a>
            </div>
            <div className="mt-6">
              <a
                href={`mailto:${officialEmail}`}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                Email Us
              </a>
            </div>
          </div>

          {/* Phone Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-neutral-800 text-lg">Call Us</h3>
              <p className="text-xs text-neutral-500 mt-1">Speak directly with one of our client relationship experts.</p>
              <a
                href={`tel:${officialPhone}`}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 mt-4 block px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
              >
                {officialPhone}
              </a>
            </div>
            <div className="mt-6">
              <a
                href={`tel:${officialPhone}`}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                Call Us
              </a>
            </div>
          </div>

          {/* WhatsApp Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100 mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-neutral-800 text-lg">WhatsApp Chat</h3>
              <p className="text-xs text-neutral-500 mt-1">Chat instantly. Available directly on mobile or web.</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-green-600 hover:text-green-700 mt-4 block px-2 py-1 rounded hover:bg-green-50 transition-colors"
              >
                {officialPhone}
              </a>
            </div>
            <div className="mt-6">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Business Hours & Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm mb-12">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 flex-shrink-0 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-800 text-sm">Business Hours</h4>
              <p className="text-xs text-neutral-500 mt-1">
                Our team is actively online Monday to Sunday, 24/7. Standard phone calls are guaranteed to be answered immediately.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 flex-shrink-0 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-800 text-sm">Secure Communication</h4>
              <p className="text-xs text-neutral-500 mt-1">
                Your support tickets, chat details, and private profile information are securely encrypted and protected under our strict privacy policies.
              </p>
            </div>
          </div>
        </div>

        {/* Call to action for self-service help */}
        <div className="text-center bg-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-blue-900 text-lg">Looking for immediate answers?</h3>
          <p className="text-xs sm:text-sm text-blue-700 mt-1.5 max-w-lg mx-auto">
            You can find interactive walkthroughs, troubleshooting guides, and role-specific manuals right inside your dashboard Help Center.
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 hover:underline"
            >
              <HelpCircle className="w-4 h-4" />
              Go to Dashboard Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;