const mongoose = require('mongoose');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const AppError = require('../utils/AppError');
const leadRepository = require('../repositories/leadRepository');
const userRepository = require('../repositories/userRepository');
const dashboardService = require('./dashboardService');

const PROPERTY_TYPES = ['1BHK', '2BHK', '3BHK', 'Plot', 'Villa', 'Commercial', 'Other'];
const SOURCES = ['Facebook', 'Google', 'Referral', 'Walk-in', 'Website', 'Other'];
const SORT_FIELDS = ['name', 'createdAt', 'followUpDate', 'budget'];
const SORT_ORDERS = ['asc', 'desc'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class LeadService {
  async findActiveAgent(id) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid or inactive agent', 400, 'INVALID_AGENT');
    }

    const agent = await userRepository.findById(id);
    if (!agent || !agent.isActive) {
      throw new AppError('Invalid or inactive agent', 400, 'INVALID_AGENT');
    }

    return agent._id;
  }

  buildFilter({ search, status, source, assignedAgent }) {
    const filter = {};

    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
    }

    if (status) {
      filter.status = { $in: status.split(',').filter(Boolean) };
    }

    if (source) {
      filter.source = { $in: source.split(',').filter(Boolean) };
    }

    if (assignedAgent) {
      if (!mongoose.isValidObjectId(assignedAgent)) {
        throw new AppError('Invalid assigned agent', 400, 'INVALID_AGENT');
      }
      filter.assignedAgent = new mongoose.Types.ObjectId(assignedAgent);
    }

    return filter;
  }

  scopeFilter(filter, actor) {
    if (actor.role === 'admin') return filter;
    return { ...filter, assignedAgent: new mongoose.Types.ObjectId(actor.id) };
  }

  async list(query, actor) {
    const { page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      throw new AppError('Invalid pagination values', 400, 'INVALID_QUERY');
    }

    if (!SORT_FIELDS.includes(sortBy) || !SORT_ORDERS.includes(sortOrder)) {
      throw new AppError('Invalid sort values', 400, 'INVALID_QUERY');
    }

    const filter = this.scopeFilter(this.buildFilter(query), actor);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const [leads, total] = await Promise.all([
      leadRepository.find(filter, {
        skip: (pageNumber - 1) * pageSize,
        limit: pageSize,
        sort,
      }),
      leadRepository.count(filter),
    ]);

    return {
      leads,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    };
  }

  async get(id, actor) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid lead id', 400, 'INVALID_ID');
    }

    const lead =
      actor.role === 'admin'
        ? await leadRepository.findById(id)
        : await leadRepository.findOne({ _id: id, assignedAgent: actor.id });
    if (!lead) throw new AppError('Lead not found', 404, 'NOT_FOUND');
    return lead;
  }

  async create(data, actor) {
    const assignedAgent =
      actor.role === 'admin'
        ? data.assignedAgent
          ? await this.findActiveAgent(data.assignedAgent)
          : undefined
        : actor.id;

    const lead = await leadRepository.create({
      ...data,
      assignedAgent,
      status: 'New',
      activities: [
        {
          action: 'created',
          detail: 'Lead created',
          performedBy: actor.name,
          createdAt: new Date(),
        },
      ],
    });
    await dashboardService.invalidateCache();
    return lead;
  }

  async update(id, data, actor) {
    const current = await this.get(id, actor);
    const update = { ...data };
    const activities = [];

    if (update.assignedAgent !== undefined) {
      if (actor.role !== 'admin' && String(update.assignedAgent || '') !== actor.id) {
        throw new AppError('Agents can only keep leads assigned to themselves', 403, 'FORBIDDEN');
      }
      update.assignedAgent = update.assignedAgent
        ? await this.findActiveAgent(update.assignedAgent)
        : undefined;
    }

    for (const field of Object.keys(data)) {
      if (field === 'status' && data.status !== current.status) {
        activities.push({
          action: 'status_changed',
          detail: `${current.status} -> ${data.status}`,
          performedBy: actor.name,
          createdAt: new Date(),
        });
      } else if (
        field === 'assignedAgent' &&
        String(data.assignedAgent || '') !== String(current.assignedAgent?._id || '')
      ) {
        activities.push({
          action: 'field_updated',
          detail: 'assignedAgent',
          performedBy: actor.name,
          createdAt: new Date(),
        });
      } else if (
        field !== 'status' &&
        field !== 'assignedAgent' &&
        String(data[field]) !== String(current[field])
      ) {
        activities.push({
          action: 'field_updated',
          detail: field,
          performedBy: actor.name,
          createdAt: new Date(),
        });
      }
    }

    if (activities.length) {
      update.$push = { activities: { $each: activities } };
    }

    const lead = await leadRepository.update(id, update);
    await dashboardService.invalidateCache();
    return lead;
  }

  async remove(id, actor) {
    await this.get(id, actor);
    await leadRepository.delete(id);
    await dashboardService.invalidateCache();
  }

  async addNote(id, content, actor) {
    await this.get(id, actor);
    const text = content.trim();
    const now = new Date();

    const lead = await leadRepository.addNote(
      id,
      { content: text, createdBy: actor.name, createdAt: now, updatedAt: now },
      { action: 'note_added', detail: text.slice(0, 500), performedBy: actor.name, createdAt: now }
    );
    await dashboardService.invalidateCache();
    return lead;
  }

  async exportRows(query, actor) {
    return leadRepository.findAll(this.scopeFilter(this.buildFilter(query), actor));
  }

  async importCsv(buffer, actor) {
    const rows = [];

    await new Promise((resolve, reject) => {
      Readable.from(buffer)
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    const validRows = [];
    const errors = [];
    const warnings = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const name = clean(row.name);
      const phone = clean(row.phone);
      const email = clean(row.email);

      if (!name) {
        errors.push({ row: rowNumber, reason: 'Missing required field: name' });
        continue;
      }
      if (!phone) {
        errors.push({ row: rowNumber, reason: 'Missing required field: phone' });
        continue;
      }
      if (!email || !emailPattern.test(email)) {
        errors.push({ row: rowNumber, reason: 'Invalid email format' });
        continue;
      }

      const propertyType = clean(row.propertytype) || 'Other';
      const source = clean(row.source) || 'Other';
      if (!PROPERTY_TYPES.includes(propertyType)) {
        errors.push({ row: rowNumber, reason: 'Invalid property type' });
        continue;
      }
      if (!SOURCES.includes(source)) {
        errors.push({ row: rowNumber, reason: 'Invalid source' });
        continue;
      }

      const lead = {
        name,
        phone,
        email,
        budget: row.budget ? Number(row.budget) : 0,
        location: clean(row.location),
        propertyType,
        source,
        status: 'New',
        activities: [
          {
            action: 'imported',
            detail: 'CSV import',
            performedBy: actor.name,
            createdAt: new Date(),
          },
        ],
      };

      if (!Number.isFinite(lead.budget) || lead.budget < 0) {
        errors.push({ row: rowNumber, reason: 'Invalid budget' });
        continue;
      }

      if (actor.role === 'admin' && clean(row.assignedagent)) {
        const agent = await userRepository.findByEmail(clean(row.assignedagent));
        if (agent && agent.isActive) {
          lead.assignedAgent = agent._id;
        } else {
          warnings.push({
            row: rowNumber,
            reason: `row ${rowNumber}: agent email not found, left unassigned`,
          });
        }
      }

      if (actor.role !== 'admin') {
        lead.assignedAgent = actor.id;
      }

      validRows.push(lead);
    }

    if (validRows.length) {
      await leadRepository.insertMany(validRows);
      await dashboardService.invalidateCache();
    }

    return {
      imported: validRows.length,
      skipped: errors.length,
      errors,
      warnings,
    };
  }
}

module.exports = new LeadService();
