-- vhdl-linter-disable port-declaration
package package_a is
  type type_a is record
    a : integer;
  end record;
end package;

package package_b is
  type type_b is record
    b : integer;
  end record;
end package;

context recursive_a is
  use work.package_a;
  context work.recursive_b;
end context recursive_a;

-- Disable remaining circular dependency error
-- vhdl-linter-disable elaborate
context recursive_b is
  use work.package_b;

  context work.recursive_a;
end context recursive_b;
-- vhdl-linter-enable elaborate


context work.recursive_b;
entity recursive is
  port (
    a : in type_a;
    b : in type_b
    );
end entity;
