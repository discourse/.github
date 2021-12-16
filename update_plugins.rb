#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'fileutils'

TITLE = "DEV: Update CI workflows"
BRANCH = "update-ci"
PR_BODY = "Updates CI from discourse/.github"

def run(*args)
  puts "> " + args.join(" ")
  system(*args, exception: true)
end

config = YAML.load_file(
  File.join("repositories.yml")
)

repositories = config["repositories"]

repositories.each do |repo|
  FileUtils.rm_rf("plugin")
  run "git", "clone", "https://github.com/discourse/#{repo}", "-q", "--depth", "1", "plugin"
  FileUtils.mkdir_p("plugin/.github/workflows")
  FileUtils.cp Dir.glob("./workflow-templates/*.yml"), "plugin/.github/workflows"

  any_changes = `git -C plugin status --porcelain`.strip != ""
  if !any_changes
    puts "✅ '#{repo}' is already up to date"
    next
  end

  puts "Updating '#{repo}'"

  FileUtils.chdir("plugin") do
    run "git", "checkout", "-b", BRANCH
    run "git", "add", ".github/workflows/*"
    run "git", "commit", "-m", TITLE
    run "git", "push", "-f", "--set-upstream", "origin", BRANCH
    begin
      run "gh", "pr", "create", "-f", "--head", BRANCH, "--body", PR_BODY
      puts "✅ PR created for '#{repo}'"
    rescue
      puts "Failed to create PR. Maybe it already exists"
      puts "❓ PR already exists for '#{repo}'"
    end
    sleep 10 # Avoid hitting GitHub rate limiting
  end
end

FileUtils.rm_rf("plugin")
