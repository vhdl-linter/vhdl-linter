-- vhdl-linter-disable port-declaration

context recursive_a is
  use work.package_a;
  context work.recursive_b;
end context recursive_a;

-- vhdl-linter-disable elaborate
context recursive_b is
  use work.package_b;

  context work.recursive_a;
end context recursive_b;
-- vhdl-linter-enable elaborate

package package_a is
  type type_a is record
  end record;
end package;

package package_b is
  type type_b is record
  end record;
end package;

context work.recursive_b;
entity recursive is
  port (
    a : in type_a;
    b : in type_b
    );
end entity;
